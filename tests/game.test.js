import { describe, it, expect, beforeEach } from 'vitest'
import { GameState } from '../js/game.js'

describe('GameState', () => {
  let game

  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear()
    game = new GameState()
  })

  it('initializes with correct default values', () => {
    expect(game.currentLevel).toBe('easy')
    expect(game.currentSentenceIndex).toBe(0)
    expect(game.timer).toBe(0)
    expect(game.timerInterval).toBeNull()
    expect(game.bestTime).toBe(Infinity)
    expect(game.remainingWords).toEqual([])
  })

  it('updates timer correctly', () => {
    expect(game.timer).toBe(0)
    game.updateTimer()
    expect(game.timer).toBe(1)
    game.updateTimer()
    expect(game.timer).toBe(2)
  })

  it('updates level correctly', () => {
    expect(game.currentLevel).toBe('easy')
    game.updateLevel()
    expect(game.currentLevel).toBe('medium')
    game.updateLevel()
    expect(game.currentLevel).toBe('hard')
  })

  it('handles best time updates correctly', () => {
    game.timer = 100
    expect(game.checkBestTime()).toBe(true)
    expect(game.bestTime).toBe(100)
    expect(localStorage.getItem('bestTime')).toBe('100')

    // Should not update if time is worse
    game.timer = 150
    expect(game.checkBestTime()).toBe(false)
    expect(game.bestTime).toBe(100)
    expect(localStorage.getItem('bestTime')).toBe('100')
  })

  it('prepares new sentence correctly', () => {
    const sentence = game.prepareNewSentence()
    expect(sentence).toBeDefined()
    expect(game.remainingWords.length).toBeGreaterThan(0)
    expect(game.remainingWords[0]).toHaveProperty('word')
    expect(game.remainingWords[0]).toHaveProperty('index')
  })

  it('handles game progression correctly', () => {
    // Should return true while game can continue
    expect(game.nextSentence()).toBe(true)
    
    // Move to end of easy level
    while (game.currentLevel === 'easy') {
      game.nextSentence()
    }
    expect(game.currentLevel).toBe('medium')
    
    // Move to end of medium level
    while (game.currentLevel === 'medium') {
      game.nextSentence()
    }
    expect(game.currentLevel).toBe('hard')
    
    // Move to last sentence of hard level
    while (game.currentSentenceIndex < 2) {
      game.nextSentence()
    }
    // Should return false on game completion
    expect(game.nextSentence()).toBe(false)
  })

  it('resets game state correctly', () => {
    // Change some values
    game.currentLevel = 'hard'
    game.currentSentenceIndex = 2
    game.timer = 100
    game.remainingWords = ['test']
    
    // Reset
    game.resetGame()
    
    // Check reset values
    expect(game.currentLevel).toBe('easy')
    expect(game.currentSentenceIndex).toBe(0)
    expect(game.timer).toBe(0)
    expect(game.remainingWords).toEqual([])
  })
})
