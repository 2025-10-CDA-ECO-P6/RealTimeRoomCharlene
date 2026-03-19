// ============================================================
// LOGIQUE MÉTIER DU MEMORY (version JS pour React/Vite)
// ============================================================

// Structure d'une carte :
// {
//   id: number,
//   symbol: string,
//   isFlipped: boolean,
//   isMatched: boolean
// }

// ------------------------------------------------------------
// CRÉATION DU PLATEAU
// ------------------------------------------------------------
export function createBoard(symbols) {
  return [...symbols, ...symbols]
    .sort(() => Math.random() - 0.5)
    .map((symbol, index) => ({
      id: index,
      symbol,
      isFlipped: false,
      isMatched: false,
    }));
}

// ------------------------------------------------------------
// RETOURNER UNE CARTE
// ------------------------------------------------------------
export function flipCard(board, id) {
  return board.map((card) =>
    card.id === id && !card.isMatched
      ? { ...card, isFlipped: true }
      : card
  );
}

// ------------------------------------------------------------
// VÉRIFIER UNE PAIRE
// ------------------------------------------------------------
export function checkMatch(board, id1, id2) {
  const card1 = board.find((c) => c.id === id1);
  const card2 = board.find((c) => c.id === id2);

  // Si les symboles correspondent → les cartes sont gagnées
  if (card1?.symbol === card2?.symbol) {
    return board.map((card) =>
      card.id === id1 || card.id === id2
        ? { ...card, isMatched: true }
        : card
    );
  }

  // Sinon → on les retourne face cachée
  return board.map((card) =>
    card.id === id1 || card.id === id2
      ? { ...card, isFlipped: false }
      : card
  );
}

// ------------------------------------------------------------
// VÉRIFIER SI LA PARTIE EST GAGNÉE
// ------------------------------------------------------------
export function isGameWon(board) {
  return board.every((card) => card.isMatched);
}