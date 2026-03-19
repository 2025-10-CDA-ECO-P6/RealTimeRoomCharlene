import { describe, it, expect } from 'vitest'
import { createBoard, flipCard, checkMatch, isGameWon } from './memory'

// ============================================================
// PARCOURS NOMINAL — le jeu se déroule normalement
// ============================================================

describe('Parcours nominal', () => {
  it('Doit créer un tableau avec des paires de cartes', () => {
    const board = createBoard(['🐶', '🐱', '🐭'])
    expect(board).toHaveLength(6)
  })

  it('Doit créer des cartes avec un id, un symbole et isFlipped false par défaut', () => {
    const board = createBoard(['🐶', '🐱'])
    expect(board[0]).toEqual({ id: 0, symbol: '🐶', isFlipped: false, isMatched: false })
    expect(board[1]).toEqual({ id: 1, symbol: '🐱', isFlipped: false, isMatched: false })
  })

  it('Doit retourner une carte lorsqu\'elle est cliquée', () => {
    const board = createBoard(['🐶', '🐱'])
    const newBoard = flipCard(board, 0)
    expect(newBoard[0].isFlipped).toBe(true)
    expect(newBoard[1].isFlipped).toBe(false)
  })

  it('Doit faire correspondre deux cartes avec le même symbole', () => {
    const board = createBoard(['🐶', '🐱'])
    const newBoard = checkMatch(board, 0, 2) // id 0 et id 2 sont tous les deux 🐶
    expect(newBoard[0].isMatched).toBe(true)
    expect(newBoard[2].isMatched).toBe(true)
    expect(newBoard[1].isMatched).toBe(false)
  })

  it('Doit retourner true quand toutes les cartes sont matchées', () => {
    let board = createBoard(['🐶', '🐱'])
    board = checkMatch(board, 0, 2) // match 🐶
    board = checkMatch(board, 1, 3) // match 🐱
    expect(isGameWon(board)).toBe(true)
  })
})

// ============================================================
// CAS D'ERREUR — le joueur fait une action incorrecte
// ============================================================

describe('Cas d\'erreur', () => {
  it('Doit retourner les deux cartes si elles ne correspondent pas', () => {
    let board = createBoard(['🐶', '🐱'])
    board = flipCard(board, 0)
    board = flipCard(board, 1)
    const newBoard = checkMatch(board, 0, 1) // 🐶 et 🐱 sont différents
    expect(newBoard[0].isFlipped).toBe(false)
    expect(newBoard[1].isFlipped).toBe(false)
  })

  it('Ne doit pas retourner une carte qui est déjà matchée', () => {
    let board = createBoard(['🐶', '🐱'])
    board = flipCard(board, 0)
    board = flipCard(board, 2)
    board = checkMatch(board, 0, 2) // 🐶 matché
    const newBoard = flipCard(board, 0) // on essaie de retourner une carte matchée
    expect(newBoard[0].isMatched).toBe(true)
    expect(newBoard[0].isFlipped).toBe(true) // reste face visible
  })

  it('Doit retourner false quand toutes les cartes ne sont pas matchées', () => {
    let board = createBoard(['🐶', '🐱'])
    board = checkMatch(board, 0, 2) // seulement 🐶 matché
    expect(isGameWon(board)).toBe(false)
  })
})

// ============================================================
// CAS AUX FRONTIÈRES — valeurs à la limite du domaine valide
// ============================================================

describe('Cas aux frontières', () => {
  it('Doit créer 2 cartes avec un seul symbole (minimum jouable)', () => {
    const board = createBoard(['🐶'])
    expect(board).toHaveLength(2)
    expect(board[0].symbol).toBe('🐶')
    expect(board[1].symbol).toBe('🐶')
  })
})

// ============================================================
// CAS LIMITES — entrées extrêmes ou invalides
// ============================================================

describe('Cas limites', () => {
  it('Doit retourner un tableau vide si aucun symbole n\'est fourni', () => {
    const board = createBoard([])
    expect(board).toHaveLength(0)
  })

  it('Ne doit pas matcher une carte avec elle-même', () => {
    let board = createBoard(['🐶'])
    board = flipCard(board, 0)
    const newBoard = checkMatch(board, 0, 0)
    expect(newBoard[0].isMatched).toBe(false)
  })

  it('Ne doit rien changer si l\'id n\'existe pas', () => {
    const board = createBoard(['🐶'])
    const newBoard = flipCard(board, 999)
    expect(newBoard).toEqual(board)
  })

  it('Doit retourner false si le plateau est vide', () => {
    expect(isGameWon([])).toBe(false)
  })
})