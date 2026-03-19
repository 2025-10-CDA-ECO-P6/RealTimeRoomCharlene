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
  try {
    return JSON.parse(localStorage.getItem(LEADERBOARD_KEY) || "[]");
  } catch {
    return [];
  }
}

function saveScore(newScore) {
  const scores = getLeaderboard();
  const updated = [...scores, newScore]
    .sort((a, b) => a.moves - b.moves || a.time - b.time)
    .slice(0, 3);

  localStorage.setItem(LEADERBOARD_KEY, JSON.stringify(updated));
  return updated;
}

export default function MemoryBoard() {
  const [pseudo, setPseudo] = useState("");
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
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
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

    if (flipped.length === 0 && moves === 0 && time === 0) {
      startTimer();
    }

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
            pseudo: pseudo.trim() || "Anonyme",
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
      <h1 className="memory-title">Memory Game</h1>

      {/* Barre de contrôles */}
      <div className="memory-controls">
        <input
          type="text"
          value={pseudo}
          onChange={(e) => setPseudo(e.target.value)}
          placeholder="Entrez votre pseudo"
          maxLength={20}
          className="memory-pseudo-input"
        />
        <span>Coups : <strong>{moves}</strong></span>
        <span>⏱️ <strong>{formatTime(time)}</strong></span>
        <button
          onClick={startGame}
          className="memory-btn"
        >
          Nouvelle partie
        </button>
      </div>

      {/* Message de victoire */}
      {won && (
        <div className="memory-victory">
          🎉 Bravo <strong>{pseudo || "Anonyme"}</strong> ! Partie terminée en{" "}
          <strong>{moves}</strong> coups et <strong>{formatTime(time)}</strong> !
        </div>
      )}

      <div className="memory-content">
        {/* Plateau */}
        <div className="memory-board">
          {board.map((card) => (
            <button
              key={card.id}
              onClick={() => handleCardClick(card.id)}
              disabled={card.isMatched || card.isFlipped || locked}
              className={`memory-card ${
                card.isMatched
                  ? "memory-card--matched"
                  : card.isFlipped
                  ? "memory-card--open"
                  : "memory-card--closed"
              }`}
            >
              {card.isFlipped || card.isMatched ? card.symbol : ""}
            </button>
          ))}
        </div>

        {/* Palmarès */}
        {leaderboard.length > 0 && (
          <div className="memory-leaderboard">
            <h2>🏆 Palmarès</h2>
            {leaderboard.map((s, i) => (
              <div key={i} className="leaderboard-item">
                <div className="item-player">
                  <span>{["🥇", "🥈", "🥉"][i]}</span>
                  <span>{s.pseudo}</span>
                </div>
                <div className="item-stats">
                  {s.moves} coups · {formatTime(s.time)} · {s.date}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}