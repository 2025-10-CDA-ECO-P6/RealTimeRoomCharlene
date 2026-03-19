// ============================================================
// IMPORTS
// ============================================================
import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import http from "http";
import { Server } from "socket.io";

// ============================================================
// CONFIG EXPRESS
// ============================================================
const app = express();
const PORT = process.env.PORT || 3001;

// Sécurité
app.use(helmet());

// Rate limiting : max 100 requêtes par 15 min par IP
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  message: "Trop de requêtes, veuillez réessayer plus tard.",
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(limiter);

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
// VALIDATION UTILS
// ============================================================
function validatePseudo(pseudo) {
  if (!pseudo || typeof pseudo !== "string") return false;
  const trimmed = pseudo.trim();
  if (trimmed.length < 2 || trimmed.length > 20) return false;
  return /^[a-zA-Z0-9_\-àâäéèêëïîôùûüœæçÀÂÄÉÈÊËÏÎÔÙÛÜŒÆÇ ]+$/.test(trimmed);
}

function validateRoom(room) {
  if (!room || typeof room !== "string") return false;
  const trimmed = room.trim();
  if (trimmed.length < 2 || trimmed.length > 50) return false;
  return /^[a-zA-Z0-9 \-àâäéèêëïîôùûüœæçÀÂÄÉÈÊËÏÎÔÙÛÜŒÆÇ]+$/.test(trimmed);
}

function validateMessage(content) {
  if (!content || typeof content !== "string") return false;
  const trimmed = content.trim();
  if (trimmed.length < 1 || trimmed.length > 500) return false;
  return true;
}

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
    if (!validateRoom(room) || !validatePseudo(pseudo)) {
      return socket.emit("error", "Pseudo ou room invalide");
    }

    socket.join(room);
    socket.to(room).emit("system", `${pseudo.trim()} a rejoint la room`);
  });

  socket.on("message", ({ room, pseudo, content }) => {
    if (!validateRoom(room) || !validatePseudo(pseudo) || !validateMessage(content)) {
      return socket.emit("error", "Message invalide");
    }

    console.log(`MESSAGE : ${pseudo} -> ${content}`);
    io.to(room).emit("message", {
      pseudo: pseudo.trim(),
      content: content.trim(),
      timestamp: new Date().toISOString(),
    });
  });

  socket.on("typing", ({ room, pseudo }) => {
    if (!validateRoom(room) || !validatePseudo(pseudo)) return;
    socket.to(room).emit("typing", { pseudo: pseudo.trim() });
  });

  socket.on("stopTyping", ({ room }) => {
    if (!validateRoom(room)) return;
    socket.to(room).emit("stopTyping");
  });

  // ----------------------------------------------------------
  // PUISSANCE 4 ROOM-BASÉ (MULTIJOUEUR)
  // ----------------------------------------------------------
  const p4Games = new Map(); // room → { players: [{ id, pseudo, playerNum }], board, currentPlayer }

  socket.on("p4-join", ({ room, pseudo }) => {
    console.log(`P4 JOIN : ${pseudo} (${socket.id}) -> ${room}`);
    if (!validateRoom(room) || !validatePseudo(pseudo)) {
      return socket.emit("error", "Données invalides");
    }

    socket.join(room);

    // Initialiser la game si elle n'existe pas
    if (!p4Games.has(room)) {
      p4Games.set(room, {
        players: [],
        board: Array.from({ length: 6 }, () => Array(7).fill(null)),
        currentPlayer: 1,
      });
    }

    const game = p4Games.get(room);

    // Vérifier que le joueur n'est pas déjà dans la partie
    if (game.players.some((p) => p.id === socket.id)) {
      return;
    }

    // Assigner le numéro de joueur
    let playerNum;
    if (game.players.length === 0) {
      playerNum = 1;
      // Envoyer "waiting" au premier joueur
      socket.emit("p4-waiting");
    } else if (game.players.length === 1) {
      playerNum = 2;
      // Assigner les deux joueurs
      const opponent1 = game.players[0];
      io.to(opponent1.id).emit("p4-player-assigned", {
        playerNum: 1,
        opponent: pseudo,
      });
      socket.emit("p4-player-assigned", { playerNum: 2, opponent: opponent1.pseudo });
    } else {
      // Trop de joueurs, rejeter
      return socket.emit("message", "P4: Partie complète");
    }

    game.players.push({ id: socket.id, pseudo, playerNum });
  });

  socket.on("p4-move", ({ room, col }) => {
    if (!room || !p4Games.has(room)) return;

    const game = p4Games.get(room);
    const player = game.players.find((p) => p.id === socket.id);
    if (!player) return;

    // Valider que c'est le tour du joueur
    if (player.playerNum !== game.currentPlayer) return;

    // Appliquer le coup
    let placed = false;
    for (let row = 5; row >= 0; row--) {
      if (game.board[row][col] === null) {
        game.board[row][col] = game.currentPlayer;
        placed = true;
        break;
      }
    }
    if (!placed) return; // Colonne pleine

    // Vérifier gagnant
    const winner = checkWinner(game.board);
    const isDraw = game.board.every((row) => row.every((cell) => cell !== null));

    if (winner || isDraw) {
      // Partie terminée
      io.to(room).emit("p4-game-over", {
        winner: winner || null,
        isDraw,
        board: game.board,
      });
      p4Games.delete(room);
      return;
    }

    // Changer de joueur
    game.currentPlayer = game.currentPlayer === 1 ? 2 : 1;

    // Notifier l'autre joueur
    const otherPlayer = game.players.find((p) => p.playerNum !== player.playerNum);
    if (otherPlayer) {
      socket.to(otherPlayer.id).emit("p4-move", { col });
    }
  });

  socket.on("p4-restart", ({ room }) => {
    if (!p4Games.has(room)) {
      p4Games.set(room, {
        players: p4Games.get(room)?.players || [],
        board: Array.from({ length: 6 }, () => Array(7).fill(null)),
        currentPlayer: 1,
      });
    } else {
      const game = p4Games.get(room);
      game.board = Array.from({ length: 6 }, () => Array(7).fill(null));
      game.currentPlayer = 1;
    }

    io.to(room).emit("p4-restart-ack");
  });

  // ----------------------------------------------------------
  // ANCIENNE PUISSANCE 4 (À GARDER POUR COMPATIBILITÉ)
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

    // P4 room-based: notifier l'adversaire
    for (const [room, game] of p4Games.entries()) {
      const player = game.players.find((p) => p.id === socket.id);
      if (player) {
        const otherPlayer = game.players.find((p) => p.id !== socket.id);
        if (otherPlayer) {
          io.to(otherPlayer.id).emit("p4-opponent-left");
        }
        p4Games.delete(room);
        break;
      }
    }

    // Ancienne logique P4 (compatibilité)
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