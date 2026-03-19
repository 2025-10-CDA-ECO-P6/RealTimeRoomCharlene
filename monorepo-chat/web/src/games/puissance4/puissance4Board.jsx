import { useState, useEffect } from "react";
import { createGame, dropPiece, checkWinner, isDraw, findWinningCells } from "./puissance4";
import "./puissance4Board.scss";

export default function Puissance4Board({ socket, room, pseudo }) {
  const [game, setGame] = useState(() => createGame());
  const [winner, setWinner] = useState(null);
  const [isDrawn, setIsDrawn] = useState(false);
  const [winningCells, setWinningCells] = useState(new Set());
  const [playerNumber, setPlayerNumber] = useState(null); // 1 ou 2
  const [opponent, setOpponent] = useState(null); // pseudo de l'adversaire
  const [waiting, setWaiting] = useState(false); // En attente d'un adversaire
  const [opponentLeft, setOpponentLeft] = useState(false);

  // Rejoindre la partie au montage
  useEffect(() => {
    if (!socket) return;

    // Annoncer qu'on rejoint
    socket.emit("p4-join", { room, pseudo });

    // Événement: on est assigné un numéro de joueur
    socket.on("p4-player-assigned", ({ playerNum, opponent: oppName }) => {
      setPlayerNumber(playerNum);
      setOpponent(oppName);
      setWaiting(false);
      setOpponentLeft(false);
    });

    // Événement: en attente d'adversaire
    socket.on("p4-waiting", () => {
      setWaiting(true);
      setPlayerNumber(1);
    });

    // Événement: on reçoit un coup de l'adversaire
    socket.on("p4-move", ({ col }) => {
      setGame((prevGame) => dropPiece(prevGame, col));
    });

    // Événement: l'adversaire a quitté
    socket.on("p4-opponent-left", () => {
      setOpponentLeft(true);
    });

    // Événement: partie réinitialisée par adversaire
    socket.on("p4-restart-ack", () => {
      setGame(createGame());
      setWinner(null);
      setIsDrawn(false);
      setWinningCells(new Set());
    });

    // Événement: partie terminée
    socket.on("p4-game-over", ({ winner, isDraw, board }) => {
      if (winner) {
        setWinner(winner);
        setWinningCells(findWinningCells(board));
      } else if (isDraw) {
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

  function startNewGame() {
    setGame(createGame());
    setWinner(null);
    setIsDrawn(false);
    setWinningCells(new Set());
    if (socket) {
      socket.emit("p4-restart", { room });
    }
  }

  function handleColumnClick(col) {
    // Vérifier qu'on can play
    if (winner || isDrawn || !playerNumber) return;
    if (game.currentPlayer !== playerNumber) return; // Ce n'est pas notre tour
    if (waiting || opponentLeft) return; // Pas d'adversaire
    
    const newGame = dropPiece(game, col);
    if (newGame !== game) {
      setGame(newGame);
      // Envoyer le coup à l'adversaire via socket
      if (socket) {
        socket.emit("p4-move", { room, col });
      }
    }
  }

  return (
    <div className="puissance4-container">
      <h1 className="puissance4-title">Puissance 4</h1>

      {/* Barre de contrôles */}
      <div className="puissance4-controls">
        <div className="puissance4-status">
          {opponentLeft ? (
            <span className="puissance4-status__info" style={{ color: '#d97706' }}>
              ⚠️ Adversaire déconnecté
            </span>
          ) : waiting ? (
            <span className="puissance4-status__info">
              ⏳ En attente d'un adversaire...
            </span>
          ) : !playerNumber ? (
            <span className="puissance4-status__info">
              📡 Connexion...
            </span>
          ) : winner ? (
            <span className={`puissance4-status__winner player-${winner}`}>
              🎉 Joueur {winner} a gagné! {winner === playerNumber && "C'est toi! 🏆"}
            </span>
          ) : isDrawn ? (
            <span className="puissance4-status__draw">🤝 Égalité!</span>
          ) : (
            <div style={{ textAlign: 'center' }}>
              <span className={`puissance4-status__current player-${game.currentPlayer}`}>
                {game.currentPlayer === playerNumber ? "À toi de jouer! 👉" : `Au tour de {opponent}... ⏱️`}
              </span>
              <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '0.25rem' }}>
                Toi: Joueur {playerNumber} | Adversaire: {opponent || "..."}
              </div>
            </div>
          )}
        </div>
        <button onClick={startNewGame} className="puissance4-btn" disabled={!playerNumber || opponentLeft}>
          Nouvelle partie
        </button>
      </div>

      {/* Plateau */}
      <div className="puissance4-board">
        {/* Zones de clic pour chaque colonne */}
        <div className="puissance4-drop-zone">
          {Array.from({ length: 7 }).map((_, col) => (
            <button
              key={`drop-${col}`}
              className="puissance4-drop-btn"
              onClick={() => handleColumnClick(col)}
              disabled={winner || isDrawn}
            />
          ))}
        </div>

        {/* Grille 6x7 */}
        <div className="puissance4-grid">
          {game.board.map((row, rowIdx) =>
            row.map((cell, colIdx) => {
              const key = `${rowIdx}-${colIdx}`;
              const isWinning = winningCells.has(key);
              return (
                <div
                  key={key}
                  className={`puissance4-cell ${
                    cell === 1
                      ? "puissance4-cell--player1"
                      : cell === 2
                      ? "puissance4-cell--player2"
                      : "puissance4-cell--empty"
                  } ${isWinning ? "puissance4-cell--winning" : ""}`}
                >
                  {cell && (
                    <div className={`puissance4-piece player-${cell}`} />
                  )}
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
          <span>Joueur 1</span>
        </div>
        <div className="legend-item">
          <div className="puissance4-piece player-2" />
          <span>Joueur 2</span>
        </div>
      </div>
    </div>
  );
}
