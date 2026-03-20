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

app.use(helmet());
app.use(rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: "Trop de requêtes, veuillez réessayer plus tard.",
  standardHeaders: true,
  legacyHeaders: false,
}));
app.use(cors());
app.use(express.json());

app.get("/health", (_req, res) => res.json({ status: "ok", timestamp: new Date().toISOString() }));
app.get("/", (_req, res) => res.send("API OK"));

// ============================================================
// SERVEUR HTTP + SOCKET.IO
// ============================================================
const server = http.createServer(app);

const io = new Server(server, {
  cors: { origin: "*", methods: ["GET", "POST"] },
});

// ============================================================
// ÉTAT GLOBAL
// ============================================================
let connectedUsers = 0;
const p4Games = new Map(); // room → { players, board, currentPlayer }

// ============================================================
// VALIDATION
// ============================================================
const validatePseudo = (pseudo) => {
  if (!pseudo || typeof pseudo !== "string") return false;
  const t = pseudo.trim();
  return t.length >= 2 && t.length <= 20 &&
    /^[a-zA-Z0-9_\-àâäéèêëïîôùûüœæçÀÂÄÉÈÊËÏÎÔÙÛÜŒÆÇ ]+$/.test(t);
};

const validateRoom = (room) => {
  if (!room || typeof room !== "string") return false;
  const t = room.trim();
  return t.length >= 2 && t.length <= 50 &&
    /^[a-zA-Z0-9 \-àâäéèêëïîôùûüœæçÀÂÄÉÈÊËÏÎÔÙÛÜŒÆÇ]+$/.test(t);
};

const validateMessage = (content) => {
  if (!content || typeof content !== "string") return false;
  const t = content.trim();
  return t.length >= 1 && t.length <= 500;
};

// ============================================================
// UTILITAIRES — CHAT
// ============================================================
const formatMessage = (message) => {
  const now = new Date();
  return {
    text: message,
    time: now.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
    date: now.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" }),
    timestamp: now,
  };
};

// ============================================================
// UTILITAIRES — PUISSANCE 4
// ============================================================
const createBoard = () => Array.from({ length: 6 }, () => Array(7).fill(null));

const checkWinner = (board) => {
  // Horizontal
  for (let row = 0; row < 6; row++)
    for (let col = 0; col < 4; col++) {
      const cell = board[row][col];
      if (cell && cell === board[row][col+1] && cell === board[row][col+2] && cell === board[row][col+3]) return cell;
    }
  // Vertical
  for (let row = 0; row < 3; row++)
    for (let col = 0; col < 7; col++) {
      const cell = board[row][col];
      if (cell && cell === board[row+1][col] && cell === board[row+2][col] && cell === board[row+3][col]) return cell;
    }
  // Diagonale ↘
  for (let row = 0; row < 3; row++)
    for (let col = 0; col < 4; col++) {
      const cell = board[row][col];
      if (cell && cell === board[row+1][col+1] && cell === board[row+2][col+2] && cell === board[row+3][col+3]) return cell;
    }
  // Diagonale ↗
  for (let row = 3; row < 6; row++)
    for (let col = 0; col < 4; col++) {
      const cell = board[row][col];
      if (cell && cell === board[row-1][col+1] && cell === board[row-2][col+2] && cell === board[row-3][col+3]) return cell;
    }
  return null;
};

// ============================================================
// SOCKET.IO
// ============================================================
io.on("connection", (socket) => {
  console.log("Client connecté :", socket.id);
  connectedUsers++;
  io.emit("users count", connectedUsers);

  // ----------------------------------------------------------
  // CHAT
  // ----------------------------------------------------------
  socket.on("join", ({ room, pseudo }) => {
    if (!validateRoom(room) || !validatePseudo(pseudo))
      return socket.emit("error", "Pseudo ou room invalide");
    socket.join(room);
    socket.to(room).emit("system", `${pseudo.trim()} a rejoint la room`);
  });

  socket.on("message", ({ room, pseudo, content }) => {
    if (!validateRoom(room) || !validatePseudo(pseudo) || !validateMessage(content))
      return socket.emit("error", "Message invalide");
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
  // PUISSANCE 4
  // ----------------------------------------------------------
  socket.on("p4-join", ({ room, pseudo }) => {
    if (!room || !pseudo) return;
    console.log(`P4 JOIN : ${pseudo} (${socket.id}) -> ${room}`);

    socket.join(room);

    // Créer la room si elle n'existe pas
    if (!p4Games.has(room)) {
      p4Games.set(room, {
        players: [],
        board: createBoard(),
        currentPlayer: 1,
      });
    }

    const game = p4Games.get(room);

    // Joueur déjà dans la partie → ignorer
    if (game.players.some((p) => p.id === socket.id)) return;

    // Trop de joueurs
    if (game.players.length >= 2) return socket.emit("error", "Partie complète.");

    if (game.players.length === 0) {
      // Premier joueur → attente
      game.players.push({ id: socket.id, pseudo, playerNum: 1 });
      socket.emit("p4-waiting");
    } else {
      // Deuxième joueur → la partie commence
      const player1 = game.players[0];
      game.players.push({ id: socket.id, pseudo, playerNum: 2 });

      io.to(player1.id).emit("p4-player-assigned", { playerNum: 1, opponent: pseudo });
      socket.emit("p4-player-assigned", { playerNum: 2, opponent: player1.pseudo });
    }
  });

  socket.on("p4-move", ({ room, col }) => {
    const game = p4Games.get(room);
    if (!game) return;

    const player = game.players.find((p) => p.id === socket.id);
    if (!player || player.playerNum !== game.currentPlayer) return;

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
    const draw = game.board.every((row) => row.every((cell) => cell !== null));

    if (winner || draw) {
      io.to(room).emit("p4-game-over", { winner: winner || null, isDraw: draw, board: game.board });
      p4Games.delete(room);
      return;
    }

    // Changer de joueur et notifier l'adversaire
    game.currentPlayer = game.currentPlayer === 1 ? 2 : 1;
    const other = game.players.find((p) => p.id !== socket.id);
    if (other) socket.to(other.id).emit("p4-move", { col });
  });

  socket.on("p4-restart", ({ room }) => {
    const game = p4Games.get(room);
    if (!game) return;
    game.board = createBoard();
    game.currentPlayer = 1;
    io.to(room).emit("p4-restart-ack");
  });

  // ----------------------------------------------------------
  // DÉCONNEXION
  // ----------------------------------------------------------
  socket.on("disconnect", () => {
    console.log("Client déconnecté :", socket.id);
    connectedUsers--;
    io.emit("users count", connectedUsers);

    for (const [room, game] of p4Games.entries()) {
      const idx = game.players.findIndex((p) => p.id === socket.id);
      if (idx !== -1) {
        const other = game.players.find((p) => p.id !== socket.id);
        if (other) io.to(other.id).emit("p4-opponent-left");
        p4Games.delete(room);
        break;
      }
    }
  });
});

// ============================================================
// DÉMARRAGE
// ============================================================
server.listen(PORT, "0.0.0.0", () => {
  console.log(`API + WebSocket running on port ${PORT}`);
});
