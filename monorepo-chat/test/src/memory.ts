export interface Card {
  id: number
  symbol: string
  isFlipped: boolean
  isMatched: boolean
}

export function createBoard(symbols: string[]): Card[] {
  return [...symbols, ...symbols].map((symbol, index) => ({
    id: index,
    symbol,
    isFlipped: false,
    isMatched: false
  }))
}

export function flipCard(board: Card[], id: number): Card[] {
  return board.map(card =>
    card.id === id && !card.isMatched ? { ...card, isFlipped: true } : card
  )
}
export function checkMatch(board: Card[], id1: number, id2: number): Card[] {
  if (id1 === id2) return board
  
  const card1 = board.find(c => c.id === id1)
  const card2 = board.find(c => c.id === id2)

  if (card1?.symbol === card2?.symbol) {
    return board.map(card =>
      card.id === id1 || card.id === id2
        ? { ...card, isMatched: true }
        : card
    )
  }

  return board.map(card =>
    card.id === id1 || card.id === id2
      ? { ...card, isFlipped: false }
      : card
  )
}

export function isGameWon(board: Card[]): boolean {
  if (board.length === 0) return false
  return board.every(card => card.isMatched)
}