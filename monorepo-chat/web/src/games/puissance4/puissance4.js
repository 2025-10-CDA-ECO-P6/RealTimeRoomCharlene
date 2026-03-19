// ============================================================
// LOGIQUE MÉTIER DU PUISSANCE 4 (version JS pour React/Vite)
// ============================================================

// Cell: 1 (Joueur 1), 2 (Joueur 2), ou null (vide)

// ------------------------------------------------------------
// CRÉER UNE NOUVELLE PARTIE
// ------------------------------------------------------------
export function createGame() {
  const board = Array.from({ length: 6 }, () => Array(7).fill(null));
  return { board, currentPlayer: 1 };
}

// ------------------------------------------------------------
// DESCENDRE UNE PIÈCE DANS UNE COLONNE
// ------------------------------------------------------------
export function dropPiece(game, col) {
  const board = game.board.map(row => [...row]);

  for (let row = 5; row >= 0; row--) {
    if (board[row][col] === null) {
      board[row][col] = game.currentPlayer;
      const currentPlayer = game.currentPlayer === 1 ? 2 : 1;
      return { ...game, board, currentPlayer };
    }
  }

  return game; // colonne pleine, rien ne change
}

// ------------------------------------------------------------
// VÉRIFIER S'IL Y A UN GAGNANT
// ------------------------------------------------------------
export function checkWinner(board) {
  // Horizontal
  for (let row = 0; row < 6; row++) {
    for (let col = 0; col < 4; col++) {
      const cell = board[row][col];
      if (
        cell &&
        cell === board[row][col + 1] &&
        cell === board[row][col + 2] &&
        cell === board[row][col + 3]
      ) {
        return cell;
      }
    }
  }

  // Vertical
  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 7; col++) {
      const cell = board[row][col];
      if (
        cell &&
        cell === board[row + 1][col] &&
        cell === board[row + 2][col] &&
        cell === board[row + 3][col]
      ) {
        return cell;
      }
    }
  }

  // Diagonale descendante (↘)
  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 4; col++) {
      const cell = board[row][col];
      if (
        cell &&
        cell === board[row + 1][col + 1] &&
        cell === board[row + 2][col + 2] &&
        cell === board[row + 3][col + 3]
      ) {
        return cell;
      }
    }
  }

  // Diagonale montante (↗)
  for (let row = 3; row < 6; row++) {
    for (let col = 0; col < 4; col++) {
      const cell = board[row][col];
      if (
        cell &&
        cell === board[row - 1][col + 1] &&
        cell === board[row - 2][col + 2] &&
        cell === board[row - 3][col + 3]
      ) {
        return cell;
      }
    }
  }

  return null;
}

// ------------------------------------------------------------
// VÉRIFIER S'IL Y A ÉGALITÉ (grille pleine)
// ------------------------------------------------------------
export function isDraw(board) {
  return board.every(row => row.every(cell => cell !== null));
}

// ------------------------------------------------------------
// TROUVER LES 4 PIÈCES GAGNANTES
// ------------------------------------------------------------
export function findWinningCells(board) {
  const check = (cells) => {
    const [first, ...rest] = cells;
    const val = board[first[0]][first[1]];
    return val && rest.every(([r, c]) => board[r][c] === val);
  };

  const toKey = (cells) => new Set(cells.map(([r, c]) => `${r}-${c}`));

  // Horizontal
  for (let row = 0; row < 6; row++)
    for (let col = 0; col < 4; col++) {
      const cells = [
        [row, col],
        [row, col + 1],
        [row, col + 2],
        [row, col + 3]
      ];
      if (check(cells)) return toKey(cells);
    }

  // Vertical
  for (let row = 0; row < 3; row++)
    for (let col = 0; col < 7; col++) {
      const cells = [
        [row, col],
        [row + 1, col],
        [row + 2, col],
        [row + 3, col]
      ];
      if (check(cells)) return toKey(cells);
    }

  // Diagonale descendante (↘)
  for (let row = 0; row < 3; row++)
    for (let col = 0; col < 4; col++) {
      const cells = [
        [row, col],
        [row + 1, col + 1],
        [row + 2, col + 2],
        [row + 3, col + 3]
      ];
      if (check(cells)) return toKey(cells);
    }

  // Diagonale montante (↗)
  for (let row = 3; row < 6; row++)
    for (let col = 0; col < 4; col++) {
      const cells = [
        [row, col],
        [row - 1, col + 1],
        [row - 2, col + 2],
        [row - 3, col + 3]
      ];
      if (check(cells)) return toKey(cells);
    }

  return new Set();
}
