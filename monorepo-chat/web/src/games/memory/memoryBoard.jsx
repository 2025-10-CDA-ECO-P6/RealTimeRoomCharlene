import { useState, useEffect, useRef } from "react";
import { createBoard, flipCard, checkMatch, isGameWon } from "./memory";
import "./memoryBoard.scss";

const SYMBOLS = ["🐶", "🐱", "🐭", "🐹", "🦊", "🐻", "🐼", "🐨"];
const LEADERBOARD_KEY = "memory-leaderboard";

function formatTime(seconds) {
  const m = Math.floor(seconds / 60).toString().padStart(2, "0");
  const s = (seconds % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

function getLeaderboard() {
  try { return JSON.parse(localStorage.getItem(LEADERBOARD_KEY) || "[]"); }
  catch { return []; }
}

function saveScore(newScore) {
  const scores = getLeaderboard();
  const updated = [...scores, newScore]
    .sort((a, b) => a.moves - b.moves || a.time - b.time)
    .slice(0, 3);
  localStorage.setItem(LEADERBOARD_KEY, JSON.stringify(updated));
  return updated;
}

// ── HEADER COMMUN (même style que Puissance 4) ───────────────
function MemoryHeader({ onBack, roomCode }) {
  return (
    <div className="memory-header">
      <button className="memory-back-btn" onClick={onBack}>← Retour</button>
      <h1 className="memory-title">Memory Game</h1>
      {roomCode
        ? <div className="memory-room-code">Code : <strong>{roomCode}</strong></div>
        : <div style={{ width: "80px" }} /> /* spacer pour centrer le titre */
      }
    </div>
  );
}

// ── MODE SOLO ────────────────────────────────────────────────
function MemorySolo({ pseudo, onBack }) {
  const [board, setBoard] = useState([]);
  const [flipped, setFlipped] = useState([]);
  const [moves, setMoves] = useState(0);
  const [won, setWon] = useState(false);
  const [locked, setLocked] = useState(false);
  const [time, setTime] = useState(0);
  const [leaderboard, setLeaderboard] = useState([]);
  const timerRef = useRef(null);

  useEffect(() => {
    setLeaderboard(getLeaderboard());
    startGame();
    return () => stopTimer();
  }, []);

  function startTimer() {
    stopTimer();
    timerRef.current = setInterval(() => setTime((t) => t + 1), 1000);
  }

  function stopTimer() {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
  }

  function startGame() {
    setBoard(createBoard(SYMBOLS));
    setFlipped([]);
    setMoves(0);
    setWon(false);
    setLocked(false);
    stopTimer();
    setTime(0);
  }

  function handleCardClick(id) {
    if (locked) return;
    if (flipped.includes(id)) return;
    if (flipped.length === 0 && moves === 0 && time === 0) startTimer();

    const newBoard = flipCard(board, id);
    const newFlipped = [...flipped, id];
    setBoard(newBoard);

    if (newFlipped.length === 2) {
      setMoves((m) => m + 1);
      setLocked(true);
      setTimeout(() => {
        const checked = checkMatch(newBoard, newFlipped[0], newFlipped[1]);
        setBoard(checked);
        setFlipped([]);
        setLocked(false);
        if (isGameWon(checked)) {
          stopTimer();
          setWon(true);
          const updated = saveScore({
            pseudo: pseudo || "Anonyme",
            moves: moves + 1,
            time,
            date: new Date().toLocaleDateString("fr-FR"),
          });
          setLeaderboard(updated);
        }
      }, 800);
    } else {
      setFlipped(newFlipped);
    }
  }

  return (
    <div className="memory-container">
      <MemoryHeader onBack={onBack} />

      {/* Contrôles */}
      <div className="memory-controls">
        <div className="memory-stats">
          <span className="memory-stat">🎯 <strong>{moves}</strong> coups</span>
          <span className="memory-stat">⏱️ <strong>{formatTime(time)}</strong></span>
        </div>
        <button onClick={startGame} className="memory-btn">Nouvelle partie</button>
      </div>

      {won && (
        <div className="memory-victory">
          🎉 Bravo <strong>{pseudo || "Anonyme"}</strong> !{" "}
          {moves} coups en {formatTime(time)} !
        </div>
      )}

      <div className="memory-content">
        <div className="memory-board">
          {board.map((card) => (
            <button key={card.id} onClick={() => handleCardClick(card.id)}
              disabled={card.isMatched || card.isFlipped || locked}
              className={`memory-card ${card.isMatched ? "memory-card--matched" : card.isFlipped ? "memory-card--open" : "memory-card--closed"}`}>
              {card.isFlipped || card.isMatched ? card.symbol : ""}
            </button>
          ))}
        </div>

        {leaderboard.length > 0 && (
          <div className="memory-leaderboard">
            <h2>🏆 Palmarès</h2>
            {leaderboard.map((s, i) => (
              <div key={i} className="leaderboard-item">
                <div className="item-player">
                  <span>{["🥇", "🥈", "🥉"][i]}</span>
                  <span>{s.pseudo}</span>
                </div>
                <div className="item-stats">{s.moves} coups · {formatTime(s.time)} · {s.date}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── MODE MULTIJOUEUR ─────────────────────────────────────────
function MemoryMulti({ socket, room, pseudo, onBack }) {
  const [board, setBoard] = useState([]);
  const [playerNum, setPlayerNum] = useState(null);
  const [opponent, setOpponent] = useState(null);
  const [currentPlayer, setCurrentPlayer] = useState(1);
  const [scores, setScores] = useState({ 1: 0, 2: 0 });
  const [waiting, setWaiting] = useState(false);
  const [opponentLeft, setOpponentLeft] = useState(false);
  const [gameOver, setGameOver] = useState(null);
  const [locked, setLocked] = useState(false);

  const isMyTurn = playerNum !== null && currentPlayer === playerNum;

  useEffect(() => {
    if (!socket) return;
    socket.emit("mem-join", { room, pseudo });

    socket.on("mem-waiting", () => setWaiting(true));

    socket.on("mem-start", ({ board: b, playerNum: pNum, opponent: opp, currentPlayer: cp, scores: sc }) => {
      setBoard(b);
      setPlayerNum(pNum);
      setOpponent(opp);
      setCurrentPlayer(cp);
      setScores(sc);
      setWaiting(false);
      setGameOver(null);
      setLocked(false);
    });

    socket.on("mem-flip-ack", ({ cardId, symbol }) => {
      setBoard((prev) => prev.map((c) => c.id === cardId ? { ...c, isFlipped: true, symbol } : c));
    });

    socket.on("mem-match", ({ cardId1, cardId2, scores: sc, currentPlayer: cp }) => {
      setBoard((prev) => prev.map((c) =>
        c.id === cardId1 || c.id === cardId2 ? { ...c, isMatched: true } : c
      ));
      setScores(sc);
      setCurrentPlayer(cp);
      setLocked(false);
    });

    socket.on("mem-no-match", ({ cardId1, cardId2, currentPlayer: cp }) => {
      setTimeout(() => {
        setBoard((prev) => prev.map((c) =>
          c.id === cardId1 || c.id === cardId2 ? { ...c, isFlipped: false, symbol: null } : c
        ));
        setCurrentPlayer(cp);
        setLocked(false);
      }, 100);
    });

    socket.on("mem-game-over", ({ scores: sc, winner }) => {
      setScores(sc);
      setGameOver({ scores: sc, winner });
    });

    socket.on("mem-restart-ack", ({ board: b, playerNum: pNum, opponent: opp, currentPlayer: cp, scores: sc }) => {
      setBoard(b);
      setPlayerNum(pNum);
      setOpponent(opp);
      setCurrentPlayer(cp);
      setScores(sc);
      setGameOver(null);
      setLocked(false);
    });

    socket.on("mem-opponent-left", () => setOpponentLeft(true));

    return () => {
      socket.off("mem-waiting");
      socket.off("mem-start");
      socket.off("mem-flip-ack");
      socket.off("mem-match");
      socket.off("mem-no-match");
      socket.off("mem-game-over");
      socket.off("mem-restart-ack");
      socket.off("mem-opponent-left");
    };
  }, [socket, room, pseudo]);

  function handleCardClick(cardId) {
    if (!isMyTurn || locked || gameOver || opponentLeft) return;
    const card = board.find((c) => c.id === cardId);
    if (!card || card.isFlipped || card.isMatched) return;
    const flippedCount = board.filter((c) => c.isFlipped && !c.isMatched).length;
    if (flippedCount >= 2) return;
    if (flippedCount === 1) setLocked(true);
    socket.emit("mem-flip", { room, cardId });
  }

  const myScore = scores[playerNum] ?? 0;
  const oppScore = scores[playerNum === 1 ? 2 : 1] ?? 0;

  return (
    <div className="memory-container">
      <MemoryHeader onBack={onBack} roomCode={room} />

      {/* Statut + scores */}
      <div className="memory-controls">
        {/* Message de statut */}
        <div className="memory-status">
          {opponentLeft ? (
            <span style={{ color: "#d97706" }}>⚠️ Adversaire déconnecté</span>
          ) : waiting ? (
            <span style={{ color: "#6b7280" }}>⏳ En attente d'un adversaire...</span>
          ) : gameOver ? (
            <span style={{ fontWeight: "bold" }}>
              {gameOver.winner === null
                ? "🤝 Égalité !"
                : gameOver.winner === playerNum
                ? `🏆 ${pseudo}, tu as gagné !`
                : `😔 ${pseudo}, tu as perdu.`}
            </span>
          ) : (
            <span className={isMyTurn ? "memory-turn--mine" : "memory-turn--other"}>
              {isMyTurn ? "À toi de jouer ! 👉" : `Tour de ${opponent || "l'adversaire"}... ⏱️`}
            </span>
          )}
        </div>

        {/* Scores — deux cartes côte à côte */}
        {playerNum && !waiting && (
          <div className="memory-scoreboard">
            <div className={`memory-scoreboard__card ${currentPlayer === playerNum ? "memory-scoreboard__card--active" : ""}`}>
              <span className="memory-scoreboard__name">🧑 {pseudo}</span>
              <span className="memory-scoreboard__score">{myScore}</span>
              <span className="memory-scoreboard__label">paires</span>
            </div>
            <div className={`memory-scoreboard__card ${currentPlayer !== playerNum ? "memory-scoreboard__card--active" : ""}`}>
              <span className="memory-scoreboard__name">👤 {opponent || "?"}</span>
              <span className="memory-scoreboard__score">{oppScore}</span>
              <span className="memory-scoreboard__label">paires</span>
            </div>
          </div>
        )}

        {gameOver && (
          <button onClick={() => socket.emit("mem-restart", { room })} className="memory-btn">
            Nouvelle partie
          </button>
        )}
      </div>

      {/* Plateau */}
      {board.length > 0 && (
        <div className="memory-board">
          {board.map((card) => (
            <button key={card.id} onClick={() => handleCardClick(card.id)}
              disabled={card.isMatched || card.isFlipped || !isMyTurn || locked || !!gameOver}
              className={`memory-card ${card.isMatched ? "memory-card--matched" : card.isFlipped ? "memory-card--open" : "memory-card--closed"}`}>
              {card.isFlipped || card.isMatched ? card.symbol : ""}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── EXPORT ───────────────────────────────────────────────────
export default function MemoryBoard({ pseudo, socket, room, onBack, multiplayer }) {
  if (multiplayer && socket && room) {
    return <MemoryMulti socket={socket} room={room} pseudo={pseudo} onBack={onBack} />;
  }
  return <MemorySolo pseudo={pseudo} onBack={onBack} />;
}
