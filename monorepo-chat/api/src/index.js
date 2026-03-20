import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import http from "http";
import { Server } from "socket.io";

const app = express();
const PORT = process.env.PORT || 3001;

app.use(helmet());
app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 100, standardHeaders: true, legacyHeaders: false }));
app.use(cors());
app.use(express.json());

app.get("/health", (_req, res) => res.json({ status: "ok", timestamp: new Date().toISOString() }));
app.get("/", (_req, res) => res.send("API OK"));

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*", methods: ["GET", "POST"] } });

let connectedUsers = 0;
const p4Games = new Map();

const validatePseudo = (p) => typeof p === "string" && p.trim().length >= 2 && p.trim().length <= 20;
const validateRoom   = (r) => typeof r === "string" && r.trim().length >= 2 && r.trim().length <= 50;
const validateMsg    = (m) => typeof m === "string" && m.trim().length >= 1 && m.trim().length <= 500;

const createBoard = () => Array.from({ length: 6 }, () => Array(7).fill(null));

const checkWinner = (board) => {
  const dirs = [[0,1],[1,0],[1,1],[1,-1]];
  for (let r = 0; r < 6; r++)
    for (let c = 0; c < 7; c++) {
      const cell = board[r][c];
      if (!cell) continue;
      for (const [dr, dc] of dirs) {
        let count = 1;
        for (let i = 1; i < 4; i++) {
          const nr = r+dr*i, nc = c+dc*i;
          if (nr>=0 && nr<6 && nc>=0 && nc<7 && board[nr][nc]===cell) count++;
          else break;
        }
        if (count === 4) return cell;
      }
    }
  return null;
};

io.on("connection", (socket) => {
  console.log("Connecté :", socket.id);
  connectedUsers++;
  io.emit("users count", connectedUsers);

  // CHAT
  socket.on("join", ({ room, pseudo }) => {
    if (!validateRoom(room) || !validatePseudo(pseudo)) return socket.emit("error", "Invalide");
    socket.join(room);
    socket.to(room).emit("system", `${pseudo.trim()} a rejoint la room`);
  });

  socket.on("message", ({ room, pseudo, content }) => {
    if (!validateRoom(room) || !validatePseudo(pseudo) || !validateMsg(content)) return socket.emit("error", "Invalide");
    io.to(room).emit("message", { pseudo: pseudo.trim(), content: content.trim(), timestamp: new Date().toISOString() });
  });

  socket.on("typing", ({ room, pseudo }) => {
    if (!validateRoom(room) || !validatePseudo(pseudo)) return;
    socket.to(room).emit("typing", { pseudo: pseudo.trim() });
  });

  socket.on("stopTyping", ({ room }) => {
    if (!validateRoom(room)) return;
    socket.to(room).emit("stopTyping");
  });

  // PUISSANCE 4
  socket.on("p4-join", ({ room, pseudo }) => {
    if (!room || !pseudo) return;
    socket.join(room);

    if (!p4Games.has(room)) {
      p4Games.set(room, { players: [], board: createBoard(), currentPlayer: 1 });
    }
    const game = p4Games.get(room);

    if (game.players.some((p) => p.id === socket.id)) return;
    if (game.players.length >= 2) return socket.emit("error", "Partie complète.");

    if (game.players.length === 0) {
      game.players.push({ id: socket.id, pseudo, playerNum: 1 });
      socket.emit("p4-waiting");
    } else {
      const p1 = game.players[0];
      game.players.push({ id: socket.id, pseudo, playerNum: 2 });
      io.to(p1.id).emit("p4-player-assigned", { playerNum: 1, opponent: pseudo });
      socket.emit("p4-player-assigned", { playerNum: 2, opponent: p1.pseudo });
    }
  });

  socket.on("p4-move", ({ room, col }) => {
    const game = p4Games.get(room);
    if (!game) return;
    const player = game.players.find((p) => p.id === socket.id);
    if (!player || player.playerNum !== game.currentPlayer) return;

    let placed = false;
    for (let row = 5; row >= 0; row--) {
      if (game.board[row][col] === null) { game.board[row][col] = game.currentPlayer; placed = true; break; }
    }
    if (!placed) return;

    const winner = checkWinner(game.board);
    const draw = game.board.every((r) => r.every((c) => c !== null));

    if (winner || draw) {
      io.to(room).emit("p4-game-over", { winner: winner || null, isDraw: draw, board: game.board });
      p4Games.delete(room);
      return;
    }

    game.currentPlayer = game.currentPlayer === 1 ? 2 : 1;
    const other = game.players.find((p) => p.id !== socket.id);
    if (other) socket.to(other.id).emit("p4-move", { col });
  });

  // ← FIX : restart renvoie les assignations joueurs pour resynchroniser les clients
  socket.on("p4-restart", ({ room }) => {
    const game = p4Games.get(room);
    if (!game || game.players.length < 2) return;

    game.board = createBoard();
    game.currentPlayer = 1;

    for (const player of game.players) {
      const opponent = game.players.find((p) => p.id !== player.id);
      io.to(player.id).emit("p4-restart-ack", {
        playerNum: player.playerNum,
        opponent: opponent.pseudo,
      });
    }
  });

  socket.on("disconnect", () => {
    console.log("Déconnecté :", socket.id);
    connectedUsers--;
    io.emit("users count", connectedUsers);

    for (const [room, game] of p4Games.entries()) {
      if (game.players.find((p) => p.id === socket.id)) {
        const other = game.players.find((p) => p.id !== socket.id);
        if (other) io.to(other.id).emit("p4-opponent-left");
        p4Games.delete(room);
        break;
      }
    }
  });
});

server.listen(PORT, "0.0.0.0", () => console.log(`Serveur sur le port ${PORT}`));