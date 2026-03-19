// Logique métier du Puissance 4
export type Cell = 1 | 2 | null

export interface Game {
  board: Cell[][]
  currentPlayer: 1 | 2
}

export function createGame(): Game {
  const board: Cell[][] = Array.from({ length: 6 }, () => Array(7).fill(null))
  return { board, currentPlayer: 1 }
}

export function dropPiece(game: Game, col: number): Game {
  const board = game.board.map(row => [...row])

  for (let row = 5; row >= 0; row--) {
    if (board[row][col] === null) {
      board[row][col] = game.currentPlayer
      const currentPlayer = game.currentPlayer === 1 ? 2 : 1
      return { ...game, board, currentPlayer }
    }
  }

  return game // colonne pleine, rien ne change
}

export function checkWinner(board: Cell[][]): 1 | 2 | null {
  // Horizontal
  for (let row = 0; row < 6; row++) {
    for (let col = 0; col < 4; col++) {
      const cell = board[row][col]
      if (cell && cell === board[row][col+1] && cell === board[row][col+2] && cell === board[row][col+3]) {
        return cell
      }
    }
  }

  // Vertical
  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 7; col++) {
      const cell = board[row][col]
      if (cell && cell === board[row+1][col] && cell === board[row+2][col] && cell === board[row+3][col]) {
        return cell
      }
    }
  }

  // Diagonale descendante
  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 4; col++) {
      const cell = board[row][col]
      if (cell && cell === board[row+1][col+1] && cell === board[row+2][col+2] && cell === board[row+3][col+3]) {
        return cell
      }
    }
  }

  // Diagonale montante
  for (let row = 3; row < 6; row++) {
    for (let col = 0; col < 4; col++) {
      const cell = board[row][col]
      if (cell && cell === board[row-1][col+1] && cell === board[row-2][col+2] && cell === board[row-3][col+3]) {
        return cell
      }
    }
  }

  return null
}

export function isDraw(board: Cell[][]): boolean {
  return board.every(row => row.every(cell => cell !== null))
}

export function findWinningCells(board: Cell[][]): Set<string> {
  const check = (cells: [number, number][]) => {
    const [first, ...rest] = cells
    const val = board[first[0]][first[1]]
    return val && rest.every(([r, c]) => board[r][c] === val)
  }
  const toKey = (cells: [number, number][]) => new Set(cells.map(([r, c]) => `${r}-${c}`))

  // Horizontal
  for (let row = 0; row < 6; row++)
    for (let col = 0; col < 4; col++) {
      const cells: [number, number][] = [[row, col], [row, col+1], [row, col+2], [row, col+3]]
      if (check(cells)) return toKey(cells)
    }
  // Vertical
  for (let row = 0; row < 3; row++)
    for (let col = 0; col < 7; col++) {
      const cells: [number, number][] = [[row, col], [row+1, col], [row+2, col], [row+3, col]]
      if (check(cells)) return toKey(cells)
    }
  // Diagonale descendante (↘)
  for (let row = 0; row < 3; row++)
    for (let col = 0; col < 4; col++) {
      const cells: [number, number][] = [[row, col], [row+1, col+1], [row+2, col+2], [row+3, col+3]]
      if (check(cells)) return toKey(cells)
    }
  // Diagonale montante (↗)
  for (let row = 3; row < 6; row++)
    for (let col = 0; col < 4; col++) {
      const cells: [number, number][] = [[row, col], [row-1, col+1], [row-2, col+2], [row-3, col+3]]
      if (check(cells)) return toKey(cells)
    }

  return new Set()
}