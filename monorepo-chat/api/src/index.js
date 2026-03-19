// ============================================================
// IMPORTS
// ============================================================
import express from "express";
import cors from "cors";
import http from "http";
import { Server } from "socket.io";

// ============================================================
// CONFIG EXPRESS
// ============================================================
const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Routes API simples
app.get("/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

app.get("/", (_req, res) => {
  res.send("API OK");
});

console.log(">>> API CHARGÉE <<<");

// ============================================================
// SERVEUR HTTP + SOCKET.IO
// ============================================================
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

// ============================================================
// ÉTAT GLOBAL
// ============================================================
let connectedUsers = 0;
const games = new Map(); // roomId → état Puissance 4

// ============================================================
// UTILITAIRES — FORMATAGE DES MESSAGES
// ============================================================
const formatMessage = (message) => {
  const now = new Date();
  return {
    text: message,
    time: now.toLocaleTimeString("fr-FR", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    }),
    date: now.toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }),
    timestamp: now,
  };
};

// ============================================================
// UTILITAIRES — PUISSANCE 4
// ============================================================
const checkWinner = (board) => {
  // Horizontal
  for (let row = 0; row < 6; row++)
    for (let col = 0; col < 4; col++) {
      const cell = board[row][col];
      if (
        cell &&
        cell === board[row][col + 1] &&
        cell === board[row][col + 2] &&
        cell === board[row][col + 3]
      )
        return cell;
    }

  // Vertical
  for (let row = 0; row < 3; row++)
    for (let col = 0; col < 7; col++) {
      const cell = board[row][col];
      if (
        cell &&
        cell === board[row + 1][col] &&
        cell === board[row + 2][col] &&
        cell === board[row + 3][col]
      )
        return cell;
    }

  // Diagonale ↘
  for (let row = 0; row < 3; row++)
    for (let col = 0; col < 4; col++) {
      const cell = board[row][col];
      if (
        cell &&
        cell === board[row + 1][col + 1] &&
        cell === board[row + 2][col + 2] &&
        cell === board[row + 3][col + 3]
      )
        return cell;
    }

  // Diagonale ↗
  for (let row = 3; row < 6; row++)
    for (let col = 0; col < 4; col++) {
      const cell = board[row][col];
      if (
        cell &&
        cell === board[row - 1][col + 1] &&
        cell === board[row - 2][col + 2] &&
        cell === board[row - 3][col + 3]
      )
        return cell;
    }

  return null;
};

// ============================================================
// SOCKET.IO — LOGIQUE TEMPS RÉEL
// ============================================================
io.on("connection", (socket) => {
  console.log("Client connecté :", socket.id);
  connectedUsers++;
  io.emit("users count", connectedUsers);

  // ----------------------------------------------------------
  // CHAT — ROOMS
  // ----------------------------------------------------------
  socket.on("join", ({ room, pseudo }) => {
    console.log(`JOIN : ${pseudo} -> ${room}`);
    if (!room || !pseudo) return;

    socket.join(room);
    socket.to(room).emit("system", `${pseudo} a rejoint la room`);
  });

  socket.on("message", ({ room, pseudo, content }) => {
    console.log(`MESSAGE : ${pseudo} -> ${content}`);
    if (!room || !pseudo || !content) return;

    io.to(room).emit("message", {
      pseudo,
      content,
      timestamp: new Date().toISOString(),
    });
  });

  // ----------------------------------------------------------
  // PUISSANCE 4 — CRÉATION / JOIN / MOUVEMENTS
  // ----------------------------------------------------------
  socket.on("create_game", () => {
    const roomId = Math.random().toString(36).substring(2, 8).toUpperCase();

    socket.join(roomId);
    games.set(roomId, {
      board: Array.from({ length: 6 }, () => Array(7).fill(null)),
      currentPlayer: 1,
      players: [socket.id],
    });

    socket.emit("game_created", { roomId });
    console.log(`Partie créée : ${roomId}`);
  });

  socket.on("join_game", (roomId) => {
    const game = games.get(roomId);
    if (!game) return socket.emit("join_error", "Partie introuvable.");
    if (game.players.length >= 2)
      return socket.emit("join_error", "Partie complète.");

    socket.join(roomId);
    game.players.push(socket.id);

    io.to(roomId).emit("game_start", {
      board: game.board,
      currentPlayer: game.currentPlayer,
    });

    console.log(`Partie ${roomId} démarrée`);
  });

  socket.on("drop_piece", ({ roomId, col }) => {
    const game = games.get(roomId);
    if (!game) return;

    const playerIndex = game.players.indexOf(socket.id);
    if (playerIndex + 1 !== game.currentPlayer) return;

    // Gravité
    let placed = false;
    for (let row = 5; row >= 0; row--) {
      if (game.board[row][col] === null) {
        game.board[row][col] = game.currentPlayer;
        placed = true;
        break;
      }
    }
    if (!placed) return;

    const winner = checkWinner(game.board);
    const isDraw = game.board.every((row) => row.every((cell) => cell !== null));

    if (winner) {
      io.to(roomId).emit("game_over", {
        winner,
        reason: "win",
        board: game.board,
      });
      games.delete(roomId);
      return;
    }

    if (isDraw) {
      io.to(roomId).emit("game_over", {
        winner: null,
        reason: "draw",
        board: game.board,
      });
      games.delete(roomId);
      return;
    }

    game.currentPlayer = game.currentPlayer === 1 ? 2 : 1;

    io.to(roomId).emit("game_update", {
      board: game.board,
      currentPlayer: game.currentPlayer,
    });
  });

  // ----------------------------------------------------------
  // DÉCONNEXION
  // ----------------------------------------------------------
  socket.on("disconnect", () => {
    console.log("Client déconnecté :", socket.id);
    connectedUsers--;
    io.emit("users count", connectedUsers);

    // Si un joueur quitte une partie en cours
    for (const [roomId, game] of games.entries()) {
      if (game.players.includes(socket.id)) {
        io.to(roomId).emit("game_over", {
          winner: null,
          reason: "disconnect",
        });
        games.delete(roomId);
      }
    }
  });
});

// ============================================================
// DÉMARRAGE SERVEUR
// ============================================================
server.listen(PORT, () => {
  console.log(`API + WebSocket running on port ${PORT}`);
});