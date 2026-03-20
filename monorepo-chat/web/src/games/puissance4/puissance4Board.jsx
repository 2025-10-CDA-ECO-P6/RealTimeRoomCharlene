import { useState, useEffect } from "react";
import { createGame, dropPiece, findWinningCells } from "./puissance4";
import "./puissance4Board.scss";

const LEADERBOARD_KEY = "puissance4-leaderboard";

function saveScore(pseudo, won) {
  try {
    const scores = JSON.parse(localStorage.getItem(LEADERBOARD_KEY) || "[]");
    const existing = scores.find((s) => s.pseudo === pseudo);
    if (existing) { if (won) existing.wins++; else existing.losses++; }
    else scores.push({ pseudo, wins: won ? 1 : 0, losses: won ? 0 : 1 });
    localStorage.setItem(LEADERBOARD_KEY, JSON.stringify(scores.sort((a, b) => b.wins - a.wins).slice(0, 3)));
  } catch {}
}

function getLeaderboard() {
  try { return JSON.parse(localStorage.getItem(LEADERBOARD_KEY) || "[]"); }
  catch { return []; }
}

export default function Puissance4Board({ socket, room, pseudo, onBack }) {
  const [game, setGame] = useState(() => createGame());
  const [winner, setWinner] = useState(null);
  const [isDrawn, setIsDrawn] = useState(false);
  const [winningCells, setWinningCells] = useState(new Set());
  const [playerNumber, setPlayerNumber] = useState(null);
  const [opponent, setOpponent] = useState(null);
  const [waiting, setWaiting] = useState(false);
  const [opponentLeft, setOpponentLeft] = useState(false);
  const [hoveredCol, setHoveredCol] = useState(null);
  const [leaderboard, setLeaderboard] = useState(() => getLeaderboard());

  useEffect(() => {
    if (!socket) return;
    socket.emit("p4-join", { room, pseudo });

    socket.on("p4-player-assigned", ({ playerNum, opponent: oppName }) => {
      setPlayerNumber(playerNum);
      setOpponent(oppName);
      setWaiting(false);
      setOpponentLeft(false);
    });

    socket.on("p4-waiting", () => {
      setWaiting(true);
      setPlayerNumber(1);
    });

    socket.on("p4-move", ({ col }) => {
      setGame((prev) => dropPiece(prev, col));
    });

    socket.on("p4-opponent-left", () => setOpponentLeft(true));

    // ← FIX : restart-ack inclut playerNum et opponent pour resync complet
    socket.on("p4-restart-ack", ({ playerNum, opponent: oppName }) => {
      setGame(createGame());
      setWinner(null);
      setIsDrawn(false);
      setWinningCells(new Set());
      setPlayerNumber(playerNum);
      setOpponent(oppName);
      setWaiting(false);
      setOpponentLeft(false);
    });

    socket.on("p4-game-over", ({ winner: w, isDraw: d, board }) => {
      if (w) {
        setWinner(w);
        setWinningCells(findWinningCells(board));
        saveScore(pseudo, w === playerNumber);
        setLeaderboard(getLeaderboard());
      } else if (d) {
        setIsDrawn(true);
      }
    });

    return () => {
      socket.off("p4-player-assigned");
      socket.off("p4-waiting");
      socket.off("p4-move");
      socket.off("p4-opponent-left");
      socket.off("p4-restart-ack");
      socket.off("p4-game-over");
    };
  }, [socket, room, pseudo]);

  function handleColumnClick(col) {
    if (winner || isDrawn || waiting || opponentLeft || !playerNumber) return;
    if (game.currentPlayer !== playerNumber) return;
    if (game.board[0][col] !== null) return;
    const newGame = dropPiece(game, col);
    if (newGame !== game) {
      setGame(newGame);
      socket?.emit("p4-move", { room, col });
    }
  }

  function startNewGame() {
    socket?.emit("p4-restart", { room });
    // Ne pas reset localement — attendre le p4-restart-ack du serveur
  }

  const isMyTurn = !winner && !isDrawn && !waiting && !opponentLeft
    && playerNumber !== null
    && game.currentPlayer === playerNumber;

  const myColor = playerNumber === 1 ? "player-1" : "player-2";

  return (
    <div className="puissance4-container">
      <div className="puissance4-header">
        <button className="puissance4-back-btn" onClick={onBack}>← Retour</button>
        <h1 className="puissance4-title">Puissance 4</h1>
        <div className="puissance4-room-code">Code : <strong>{room}</strong></div>
      </div>

      <div className="puissance4-main">
        <div className="puissance4-left">
          {/* Statut */}
          <div className="puissance4-controls">
            <div className="puissance4-status">
              {opponentLeft ? (
                <span style={{ color: "#d97706" }}>⚠️ Adversaire déconnecté</span>
              ) : waiting ? (
                <span className="puissance4-status__info">⏳ En attente d'un adversaire...</span>
              ) : !playerNumber ? (
                <span className="puissance4-status__info">📡 Connexion...</span>
              ) : winner ? (
                <span className={`puissance4-status__winner player-${winner}`}>
                  {winner === playerNumber
                    ? `🏆 ${pseudo}, tu as gagné !`
                    : `😔 ${pseudo}, tu as perdu.`}
                </span>
              ) : isDrawn ? (
                <span className="puissance4-status__draw">🤝 Égalité !</span>
              ) : (
                <div style={{ textAlign: "center" }}>
                  <span className={`puissance4-status__current player-${game.currentPlayer}`}>
                    {isMyTurn ? "À toi de jouer ! 👉" : `Au tour de ${opponent || "l'adversaire"}... ⏱️`}
                  </span>
                  <div style={{ fontSize: "0.75rem", color: "#6b7280", marginTop: "0.25rem" }}>
                    Toi : Joueur {playerNumber} {playerNumber === 1 ? "🔴" : "🟡"} | Adversaire : {opponent || "..."}
                  </div>
                </div>
              )}
            </div>
            <button
              onClick={startNewGame}
              className="puissance4-btn"
              disabled={!playerNumber || opponentLeft}
            >
              Nouvelle partie
            </button>
          </div>

          {/* Plateau */}
          <div className="puissance4-board">
            <div className="puissance4-grid">
              {game.board.map((row, rowIdx) =>
                row.map((cell, colIdx) => {
                  const key = `${rowIdx}-${colIdx}`;
                  const isWinning = winningCells.has(key);
                  const isHovered = isMyTurn && hoveredCol === colIdx && cell === null;
                  return (
                    <div
                      key={key}
                      onClick={() => handleColumnClick(colIdx)}
                      onMouseEnter={() => isMyTurn && setHoveredCol(colIdx)}
                      onMouseLeave={() => setHoveredCol(null)}
                      className={[
                        "puissance4-cell",
                        cell === 1 ? "puissance4-cell--player1"
                          : cell === 2 ? "puissance4-cell--player2"
                          : isHovered ? `puissance4-cell--hover-${myColor}`
                          : "puissance4-cell--empty",
                        isWinning ? "puissance4-cell--winning" : "",
                      ].join(" ")}
                      style={{ cursor: isMyTurn && cell === null ? "pointer" : "default" }}
                    >
                      {cell && <div className={`puissance4-piece player-${cell}`} />}
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Légende */}
          <div className="puissance4-legend">
            <div className="legend-item">
              <div className="puissance4-piece player-1" />
              <span>Joueur 1 {playerNumber === 1 ? "(toi)" : ""}</span>
            </div>
            <div className="legend-item">
              <div className="puissance4-piece player-2" />
              <span>Joueur 2 {playerNumber === 2 ? "(toi)" : ""}</span>
            </div>
          </div>
        </div>

        {/* Palmarès */}
        {leaderboard.length > 0 && (
          <div className="puissance4-leaderboard">
            <h2 className="puissance4-leaderboard__title">🏆 Palmarès</h2>
            {leaderboard.map((s, i) => (
              <div key={i} className="puissance4-leaderboard__item">
                <span className="puissance4-leaderboard__medal">{["🥇", "🥈", "🥉"][i]}</span>
                <span className="puissance4-leaderboard__name">{s.pseudo}</span>
                <span className="puissance4-leaderboard__score">{s.wins}V · {s.losses}D</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
