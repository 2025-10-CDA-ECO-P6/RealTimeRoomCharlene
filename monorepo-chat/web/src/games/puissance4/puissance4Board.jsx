import { useState, useEffect } from "react";
import { createGame, dropPiece, findWinningCells } from "./puissance4";
import "./puissance4Board.scss";

export default function Puissance4Board({ socket, room, pseudo }) {
  const [game, setGame] = useState(() => createGame());
  const [winner, setWinner] = useState(null);
  const [isDrawn, setIsDrawn] = useState(false);
  const [winningCells, setWinningCells] = useState(new Set());
  const [playerNumber, setPlayerNumber] = useState(null);
  const [opponent, setOpponent] = useState(null);
  const [waiting, setWaiting] = useState(false);
  const [opponentLeft, setOpponentLeft] = useState(false);

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

    socket.on("p4-restart-ack", () => {
      setGame(createGame());
      setWinner(null);
      setIsDrawn(false);
      setWinningCells(new Set());
    });

    socket.on("p4-game-over", ({ winner: w, isDraw: d, board }) => {
      if (w) {
        setWinner(w);
        setWinningCells(findWinningCells(board));
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
    if (game.board[0][col] !== null) return; // colonne pleine

    const newGame = dropPiece(game, col);
    if (newGame !== game) {
      setGame(newGame);
      socket?.emit("p4-move", { room, col });
    }
  }

  function startNewGame() {
    setGame(createGame());
    setWinner(null);
    setIsDrawn(false);
    setWinningCells(new Set());
    socket?.emit("p4-restart", { room });
  }

  const isMyTurn = !winner && !isDrawn && !waiting && !opponentLeft
    && playerNumber !== null
    && game.currentPlayer === playerNumber;

  return (
    <div className="puissance4-container">
      <h1 className="puissance4-title">Puissance 4</h1>

      {/* Code de la room */}
      <div style={{ fontSize: "0.75rem", color: "#6b7280" }}>
        Room : <strong style={{ fontFamily: "monospace", letterSpacing: "0.1em" }}>{room}</strong>
        {" — partage ce code avec ton adversaire !"}
      </div>

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
              🎉 Joueur {winner} a gagné ! {winner === playerNumber && "C'est toi ! 🏆"}
            </span>
          ) : isDrawn ? (
            <span className="puissance4-status__draw">🤝 Égalité !</span>
          ) : (
            <div style={{ textAlign: "center" }}>
              <span className={`puissance4-status__current player-${game.currentPlayer}`}>
                {isMyTurn ? "À toi de jouer ! 👉" : `Au tour de ${opponent || "l'adversaire"}... ⏱️`}
              </span>
              <div style={{ fontSize: "0.75rem", color: "#6b7280", marginTop: "0.25rem" }}>
                Toi : Joueur {playerNumber} {playerNumber === 1 ? "🔴" : "🔵"} | Adversaire : {opponent || "..."}
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

      {/* Plateau — clic directement sur les cellules */}
      <div className="puissance4-board">
        <div className="puissance4-grid">
          {game.board.map((row, rowIdx) =>
            row.map((cell, colIdx) => {
              const key = `${rowIdx}-${colIdx}`;
              const isWinning = winningCells.has(key);
              const isHoverable = isMyTurn && cell === null;
              return (
                <div
                  key={key}
                  onClick={() => handleColumnClick(colIdx)}
                  className={[
                    "puissance4-cell",
                    cell === 1 ? "puissance4-cell--player1"
                      : cell === 2 ? "puissance4-cell--player2"
                      : "puissance4-cell--empty",
                    isWinning ? "puissance4-cell--winning" : "",
                    isHoverable ? "puissance4-cell--hoverable" : "",
                  ].join(" ")}
                  style={{ cursor: isHoverable ? "pointer" : "default" }}
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
  );
}
