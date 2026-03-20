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
// CONFIGURATION EXPRESS
// ============================================================
const app = express();
const PORT = process.env.PORT || 3001;

app.use(helmet());
app.use(rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
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
const p4Games     = new Map(); // roomId → état Puissance 4
const memGames    = new Map(); // roomId → état Memory

// ============================================================
// VALIDATION DES ENTRÉES
// ============================================================
const validatePseudo = (p) =>
  typeof p === "string" && p.trim().length >= 2 && p.trim().length <= 20;

const validateRoom = (r) =>
  typeof r === "string" && r.trim().length >= 2 && r.trim().length <= 50;

const validateMsg = (m) =>
  typeof m === "string" && m.trim().length >= 1 && m.trim().length <= 500;

// ============================================================
// UTILITAIRES — PUISSANCE 4
// ============================================================

const createP4Board = () =>
  Array.from({ length: 6 }, () => Array(7).fill(null));

const checkP4Winner = (board) => {
  const dirs = [[0, 1], [1, 0], [1, 1], [1, -1]];
  for (let r = 0; r < 6; r++) {
    for (let c = 0; c < 7; c++) {
      const cell = board[r][c];
      if (!cell) continue;
      for (const [dr, dc] of dirs) {
        let count = 1;
        for (let i = 1; i < 4; i++) {
          const nr = r + dr * i, nc = c + dc * i;
          if (nr >= 0 && nr < 6 && nc >= 0 && nc < 7 && board[nr][nc] === cell) count++;
          else break;
        }
        if (count === 4) return cell;
      }
    }
  }
  return null;
};

// ============================================================
// UTILITAIRES — MEMORY
// ============================================================

const MEMORY_SYMBOLS = ["🐶", "🐱", "🐭", "🐹", "🦊", "🐻", "🐼", "🐨"];

// Crée un plateau Memory mélangé (16 cartes, 8 paires)
const createMemBoard = () => {
  const pairs = [...MEMORY_SYMBOLS, ...MEMORY_SYMBOLS];
  // Fisher-Yates shuffle
  for (let i = pairs.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pairs[i], pairs[j]] = [pairs[j], pairs[i]];
  }
  return pairs.map((symbol, id) => ({ id, symbol, isFlipped: false, isMatched: false }));
};

// ============================================================
// SOCKET.IO — CONNEXIONS
// ============================================================
io.on("connection", (socket) => {
  console.log("✅ Connecté :", socket.id);
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
    if (!validateRoom(room) || !validatePseudo(pseudo) || !validateMsg(content))
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
    console.log(`🎮 P4 JOIN : ${pseudo} (${socket.id}) -> ${room}`);

    socket.join(room);

    if (!p4Games.has(room)) {
      p4Games.set(room, {
        players: [],
        board: createP4Board(),
        currentPlayer: 1,
        status: "waiting",
      });
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
      game.status = "playing";
      io.to(p1.id).emit("p4-player-assigned", { playerNum: 1, opponent: pseudo });
      socket.emit("p4-player-assigned", { playerNum: 2, opponent: p1.pseudo });
      console.log(`🎮 P4 START : ${p1.pseudo} vs ${pseudo} dans ${room}`);
    }
  });

  socket.on("p4-move", ({ room, col }) => {
    const game = p4Games.get(room);
    if (!game || game.status !== "playing") return;

    const player = game.players.find((p) => p.id === socket.id);
    if (!player || player.playerNum !== game.currentPlayer) return;

    let placed = false;
    for (let row = 5; row >= 0; row--) {
      if (game.board[row][col] === null) {
        game.board[row][col] = game.currentPlayer;
        placed = true;
        break;
      }
    }
    if (!placed) return;

    const winner = checkP4Winner(game.board);
    const draw = game.board.every((r) => r.every((c) => c !== null));

    if (winner || draw) {
      // Envoyer le dernier coup à l'adversaire avant game-over
      const other = game.players.find((p) => p.id !== socket.id);
      if (other) socket.to(other.id).emit("p4-move", { col });

      game.status = "finished";
      io.to(room).emit("p4-game-over", {
        winner: winner || null,
        isDraw: draw,
        board: game.board,
      });
      console.log(`🏆 P4 END : room ${room} — gagnant : ${winner || "nul"}`);
      return;
    }

    game.currentPlayer = game.currentPlayer === 1 ? 2 : 1;
    const other = game.players.find((p) => p.id !== socket.id);
    if (other) socket.to(other.id).emit("p4-move", { col });
  });

  socket.on("p4-restart", ({ room }) => {
    const game = p4Games.get(room);
    if (!game || game.players.length < 2) return;

    game.board = createP4Board();
    game.currentPlayer = 1;
    game.status = "playing";

    for (const player of game.players) {
      const opponent = game.players.find((p) => p.id !== player.id);
      io.to(player.id).emit("p4-restart-ack", {
        playerNum: player.playerNum,
        opponent: opponent.pseudo,
      });
    }
    console.log(`🔄 P4 RESTART : room ${room}`);
  });

  // ----------------------------------------------------------
  // MEMORY MULTIJOUEUR
  // ----------------------------------------------------------

  socket.on("mem-join", ({ room, pseudo }) => {
    if (!room || !pseudo) return;
    console.log(`🃏 MEM JOIN : ${pseudo} (${socket.id}) -> ${room}`);

    socket.join(room);

    if (!memGames.has(room)) {
      memGames.set(room, {
        players: [],
        board: createMemBoard(),
        currentPlayer: 1,  // playerNum dont c'est le tour
        scores: { 1: 0, 2: 0 },
        pendingFlip: null,  // id de la première carte retournée
        status: "waiting",
      });
    }
    const game = memGames.get(room);

    if (game.players.some((p) => p.id === socket.id)) return;
    if (game.players.length >= 2) return socket.emit("error", "Partie complète.");

    if (game.players.length === 0) {
      game.players.push({ id: socket.id, pseudo, playerNum: 1 });
      socket.emit("mem-waiting");
    } else {
      const p1 = game.players[0];
      game.players.push({ id: socket.id, pseudo, playerNum: 2 });
      game.status = "playing";

      // Envoyer le plateau (sans les symboles cachés) + état de jeu
      const hiddenBoard = game.board.map(({ id, isFlipped, isMatched }) => ({
        id, isFlipped, isMatched, symbol: isFlipped || isMatched ? game.board[id].symbol : null,
      }));

      io.to(p1.id).emit("mem-start", {
        board: hiddenBoard,
        playerNum: 1,
        opponent: pseudo,
        currentPlayer: game.currentPlayer,
        scores: game.scores,
      });
      socket.emit("mem-start", {
        board: hiddenBoard,
        playerNum: 2,
        opponent: p1.pseudo,
        currentPlayer: game.currentPlayer,
        scores: game.scores,
      });
      console.log(`🃏 MEM START : ${p1.pseudo} vs ${pseudo} dans ${room}`);
    }
  });

  socket.on("mem-flip", ({ room, cardId }) => {
    const game = memGames.get(room);
    if (!game || game.status !== "playing") return;

    const player = game.players.find((p) => p.id === socket.id);
    if (!player || player.playerNum !== game.currentPlayer) return;

    const card = game.board[cardId];
    if (!card || card.isFlipped || card.isMatched) return;

    // Retourner la carte
    card.isFlipped = true;

    if (game.pendingFlip === null) {
      // Première carte du tour
      game.pendingFlip = cardId;
      io.to(room).emit("mem-flip-ack", { cardId, symbol: card.symbol });
    } else {
      // Deuxième carte du tour
      const firstCard = game.board[game.pendingFlip];
      io.to(room).emit("mem-flip-ack", { cardId, symbol: card.symbol });

      if (firstCard.symbol === card.symbol) {
        // ✅ Paire trouvée
        firstCard.isMatched = true;
        card.isMatched = true;
        game.scores[game.currentPlayer]++;
        game.pendingFlip = null;

        // Vérifier fin de partie
        const allMatched = game.board.every((c) => c.isMatched);
        if (allMatched) {
          game.status = "finished";
          const s = game.scores;
          const winner = s[1] > s[2] ? 1 : s[2] > s[1] ? 2 : null; // null = égalité
          io.to(room).emit("mem-game-over", { scores: game.scores, winner });
          console.log(`🏆 MEM END : room ${room}`);
        } else {
          // Même joueur rejoue
          io.to(room).emit("mem-match", {
            cardId1: game.board.indexOf(firstCard),
            cardId2: cardId,
            scores: game.scores,
            currentPlayer: game.currentPlayer,
          });
        }
      } else {
        // ❌ Pas de paire → retourner face cachée après délai
        const firstId = game.pendingFlip;
        game.pendingFlip = null;

        setTimeout(() => {
          firstCard.isFlipped = false;
          card.isFlipped = false;

          // Changer de joueur
          game.currentPlayer = game.currentPlayer === 1 ? 2 : 1;

          io.to(room).emit("mem-no-match", {
            cardId1: firstId,
            cardId2: cardId,
            currentPlayer: game.currentPlayer,
          });
        }, 900);
      }
    }
  });

  socket.on("mem-restart", ({ room }) => {
    const game = memGames.get(room);
    if (!game || game.players.length < 2) return;

    game.board = createMemBoard();
    game.currentPlayer = 1;
    game.scores = { 1: 0, 2: 0 };
    game.pendingFlip = null;
    game.status = "playing";

    const hiddenBoard = game.board.map(({ id, isFlipped, isMatched }) => ({
      id, isFlipped, isMatched, symbol: null,
    }));

    for (const player of game.players) {
      const opponent = game.players.find((p) => p.id !== player.id);
      io.to(player.id).emit("mem-restart-ack", {
        board: hiddenBoard,
        playerNum: player.playerNum,
        opponent: opponent.pseudo,
        currentPlayer: game.currentPlayer,
        scores: game.scores,
      });
    }
    console.log(`🔄 MEM RESTART : room ${room}`);
  });

  // ----------------------------------------------------------
  // DÉCONNEXION
  // ----------------------------------------------------------
  socket.on("disconnect", () => {
    console.log("❌ Déconnecté :", socket.id);
    connectedUsers--;
    io.emit("users count", connectedUsers);

    // Nettoyage P4
    for (const [room, game] of p4Games.entries()) {
      if (game.players.find((p) => p.id === socket.id)) {
        const other = game.players.find((p) => p.id !== socket.id);
        if (other) io.to(other.id).emit("p4-opponent-left");
        p4Games.delete(room);
        console.log(`🗑️ P4 DELETE : room ${room}`);
        break;
      }
    }

    // Nettoyage Memory
    for (const [room, game] of memGames.entries()) {
      if (game.players.find((p) => p.id === socket.id)) {
        const other = game.players.find((p) => p.id !== socket.id);
        if (other) io.to(other.id).emit("mem-opponent-left");
        memGames.delete(room);
        console.log(`🗑️ MEM DELETE : room ${room}`);
        break;
      }
    }
  });
});

// ============================================================
// DÉMARRAGE DU SERVEUR
// ============================================================
server.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Serveur démarré sur le port ${PORT}`);
});
