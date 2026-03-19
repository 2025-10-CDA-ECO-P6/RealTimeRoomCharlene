import { describe, it, expect } from 'vitest'
import { createGame, dropPiece, checkWinner, isDraw, findWinningCells } from './puissance4'

// ============================================================
// PARCOURS NOMINAL — le jeu se déroule normalement
// ============================================================

describe('Parcours nominal', () => {
  it('Doit créer une grille de 6 lignes et 7 colonnes remplie de null', () => {
    const game = createGame()
    expect(game.board).toHaveLength(6)
    expect(game.board[0]).toHaveLength(7)
    expect(game.board[0][0]).toBeNull()
  })

  it('Doit démarrer avec le joueur 1', () => {
    const game = createGame()
    expect(game.currentPlayer).toBe(1)
  })

  it('Doit placer le jeton en bas de la colonne', () => {
    const game = createGame()
    const newGame = dropPiece(game, 0)
    expect(newGame.board[5][0]).toBe(1)
  })

  it('Doit alterner le joueur après chaque coup', () => {
    const game = createGame()
    const newGame = dropPiece(game, 0)
    expect(newGame.currentPlayer).toBe(2)
  })

  it('Doit empiler les jetons dans la même colonne', () => {
    let game = createGame()
    game = dropPiece(game, 0) // joueur 1 → ligne 5
    game = dropPiece(game, 0) // joueur 2 → ligne 4
    expect(game.board[5][0]).toBe(1)
    expect(game.board[4][0]).toBe(2)
  })

  it('Doit détecter une victoire horizontale', () => {
    let game = createGame()
    game = dropPiece(game, 0) // J1
    game = dropPiece(game, 0) // J2
    game = dropPiece(game, 1) // J1
    game = dropPiece(game, 1) // J2
    game = dropPiece(game, 2) // J1
    game = dropPiece(game, 2) // J2
    game = dropPiece(game, 3) // J1 → 4 en ligne !
    expect(checkWinner(game.board)).toBe(1)
  })

  it('Doit détecter une victoire verticale', () => {
    let game = createGame()
    game = dropPiece(game, 0) // J1
    game = dropPiece(game, 1) // J2
    game = dropPiece(game, 0) // J1
    game = dropPiece(game, 1) // J2
    game = dropPiece(game, 0) // J1
    game = dropPiece(game, 1) // J2
    game = dropPiece(game, 0) // J1 → 4 en colonne !
    expect(checkWinner(game.board)).toBe(1)
  })

  it('Doit détecter une victoire en diagonale descendante', () => {
    let game = createGame()
    // Cible J1 : (2,0) (3,1) (4,2) (5,3)
    game = dropPiece(game, 3) // J1 → (5,3)
    game = dropPiece(game, 2) // J2 → (5,2)
    game = dropPiece(game, 2) // J1 → (4,2)
    game = dropPiece(game, 1) // J2 → (5,1)
    game = dropPiece(game, 6) // J1 → (5,6) filler
    game = dropPiece(game, 1) // J2 → (4,1)
    game = dropPiece(game, 1) // J1 → (3,1)
    game = dropPiece(game, 0) // J2 → (5,0)
    game = dropPiece(game, 5) // J1 → (5,5) filler
    game = dropPiece(game, 0) // J2 → (4,0)
    game = dropPiece(game, 1) // J1 → (2,1) filler
    game = dropPiece(game, 0) // J2 → (3,0)
    game = dropPiece(game, 0) // J1 → (2,0)
    expect(checkWinner(game.board)).toBe(1)
  })

  it('Doit détecter une victoire en diagonale montante', () => {
    let game = createGame()
    // Cible J1 : (5,0) (4,1) (3,2) (2,3)
    game = dropPiece(game, 0) // J1 → (5,0)
    game = dropPiece(game, 1) // J2 → (5,1)
    game = dropPiece(game, 1) // J1 → (4,1)
    game = dropPiece(game, 2) // J2 → (5,2)
    game = dropPiece(game, 4) // J1 → (5,4) filler
    game = dropPiece(game, 2) // J2 → (4,2)
    game = dropPiece(game, 2) // J1 → (3,2)
    game = dropPiece(game, 3) // J2 → (5,3)
    game = dropPiece(game, 5) // J1 → (5,5) filler
    game = dropPiece(game, 3) // J2 → (4,3)
    game = dropPiece(game, 6) // J1 → (5,6) filler
    game = dropPiece(game, 3) // J2 → (3,3)
    game = dropPiece(game, 3) // J1 → (2,3)
    expect(checkWinner(game.board)).toBe(1)
  })

  it('Doit détecter un match nul quand la grille est pleine sans vainqueur', () => {
  let game = createGame()
    // Remplissage colonne par colonne sans aligner 4
    const moves = [0,1,0,1,0,1,1,0,1,0,1,0,2,3,2,3,2,3,3,2,3,2,3,2,4,5,4,5,4,5,5,4,5,4,5,4,6,6,6,6,6,6]
    for (const col of moves) {
        game = dropPiece(game, col)
    }
    expect(isDraw(game.board)).toBe(true)
  })
})

// ============================================================
// CAS D'ERREUR — le joueur fait une action incorrecte
// ============================================================

describe('Cas d\'erreur', () => {
  it('Doit détecter une victoire du joueur 2', () => {
    let game = createGame()
    game = dropPiece(game, 0) // J1
    game = dropPiece(game, 1) // J2
    game = dropPiece(game, 0) // J1
    game = dropPiece(game, 1) // J2
    game = dropPiece(game, 0) // J1
    game = dropPiece(game, 1) // J2
    game = dropPiece(game, 2) // J1 (ailleurs)
    game = dropPiece(game, 1) // J2 → 4 en colonne !
    expect(checkWinner(game.board)).toBe(2)
  })

  it('Ne doit pas détecter de vainqueur en cours de partie', () => {
    let game = createGame()
    game = dropPiece(game, 0) // J1
    game = dropPiece(game, 1) // J2
    game = dropPiece(game, 2) // J1
    expect(checkWinner(game.board)).toBeNull()
  })

  it('Ne doit pas placer de jeton dans une colonne pleine', () => {
    let game = createGame()
    for (let i = 0; i < 6; i++) {
      game = dropPiece(game, 0)
    }
    const before = game.board.map(row => [...row])
    game = dropPiece(game, 0)
    expect(game.board).toEqual(before)
  })
})

// ============================================================
// CAS LIMITES — entrées extrêmes ou invalides
// ============================================================

describe('Cas limites', () => {
  it('Ne doit rien changer si la colonne n\'existe pas', () => {
    const game = createGame()
    const newGame = dropPiece(game, 7)
    expect(newGame.board).toEqual(game.board)
  })

  it('Ne doit rien changer si la colonne est négative', () => {
    const game = createGame()
    const newGame = dropPiece(game, -1)
    expect(newGame.board).toEqual(game.board)
  })

  it('isDraw doit retourner false sur un plateau vide', () => {
    const game = createGame()
    expect(isDraw(game.board)).toBe(false)
  })

  it('isDraw doit retourner false si la grille n\'est pas pleine', () => {
    let game = createGame()
    game = dropPiece(game, 0)
    expect(isDraw(game.board)).toBe(false)
  })
})

// ============================================================
// FIND WINNING CELLS — positions des 4 jetons gagnants
// ============================================================

describe('findWinningCells', () => {
  it('Doit retourner un Set vide si aucun vainqueur', () => {
    const game = createGame()
    expect(findWinningCells(game.board).size).toBe(0)
  })

  it('Doit retourner les 4 positions d\'une victoire horizontale', () => {
    let game = createGame()
    game = dropPiece(game, 0) // J1
    game = dropPiece(game, 0) // J2
    game = dropPiece(game, 1) // J1
    game = dropPiece(game, 1) // J2
    game = dropPiece(game, 2) // J1
    game = dropPiece(game, 2) // J2
    game = dropPiece(game, 3) // J1 → victoire ligne 5
    const cells = findWinningCells(game.board)
    expect(cells).toEqual(new Set(['5-0', '5-1', '5-2', '5-3']))
  })

  it('Doit retourner les 4 positions d\'une victoire verticale', () => {
    let game = createGame()
    game = dropPiece(game, 0) // J1
    game = dropPiece(game, 1) // J2
    game = dropPiece(game, 0) // J1
    game = dropPiece(game, 1) // J2
    game = dropPiece(game, 0) // J1
    game = dropPiece(game, 1) // J2
    game = dropPiece(game, 0) // J1 → victoire colonne 0
    const cells = findWinningCells(game.board)
    expect(cells).toEqual(new Set(['2-0', '3-0', '4-0', '5-0']))
  })

  it('Doit retourner les 4 positions d\'une victoire en diagonale descendante', () => {
    let game = createGame()
    // Cible J1 : (2,0) (3,1) (4,2) (5,3)
    game = dropPiece(game, 3) // J1 → (5,3)
    game = dropPiece(game, 2) // J2 → (5,2)
    game = dropPiece(game, 2) // J1 → (4,2)
    game = dropPiece(game, 1) // J2 → (5,1)
    game = dropPiece(game, 6) // J1 → (5,6) filler
    game = dropPiece(game, 1) // J2 → (4,1)
    game = dropPiece(game, 1) // J1 → (3,1)
    game = dropPiece(game, 0) // J2 → (5,0)
    game = dropPiece(game, 5) // J1 → (5,5) filler
    game = dropPiece(game, 0) // J2 → (4,0)
    game = dropPiece(game, 1) // J1 → (2,1) filler
    game = dropPiece(game, 0) // J2 → (3,0)
    game = dropPiece(game, 0) // J1 → (2,0)
    const cells = findWinningCells(game.board)
    expect(cells).toEqual(new Set(['2-0', '3-1', '4-2', '5-3']))
  })

  it('Doit retourner les 4 positions d\'une victoire en diagonale montante', () => {
    let game = createGame()
    // Cible J1 : (5,0) (4,1) (3,2) (2,3)
    game = dropPiece(game, 0) // J1 → (5,0)
    game = dropPiece(game, 1) // J2 → (5,1)
    game = dropPiece(game, 1) // J1 → (4,1)
    game = dropPiece(game, 2) // J2 → (5,2)
    game = dropPiece(game, 4) // J1 → (5,4) filler
    game = dropPiece(game, 2) // J2 → (4,2)
    game = dropPiece(game, 2) // J1 → (3,2)
    game = dropPiece(game, 3) // J2 → (5,3)
    game = dropPiece(game, 5) // J1 → (5,5) filler
    game = dropPiece(game, 3) // J2 → (4,3)
    game = dropPiece(game, 6) // J1 → (5,6) filler
    game = dropPiece(game, 3) // J2 → (3,3)
    game = dropPiece(game, 3) // J1 → (2,3)
    const cells = findWinningCells(game.board)
    expect(cells).toEqual(new Set(['5-0', '4-1', '3-2', '2-3']))
  })
})