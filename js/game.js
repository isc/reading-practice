import { getSentences, getPhonetic } from './data.js'

// Add storage wrapper for better testability
const storage = {
  getItem: (key) => {
    try {
      return localStorage.getItem(key)
    } catch {
      return null
    }
  },
  setItem: (key, value) => {
    try {
      localStorage.setItem(key, value)
    } catch {
      // Fail silently in test environment
    }
  }
}

export class GameState {
  constructor() {
    this.currentLevel = 'easy'
    this.currentSentenceIndex = 0
    this.timer = 0
    this.timerInterval = null
    this.remainingWords = []
    this.bestTime = parseFloat(storage.getItem('bestTime')) || Infinity
  }

  updateTimer() {
    this.timer++
  }

  startTimer() {
    if (!this.timerInterval) {
      this.timerInterval = setInterval(() => this.updateTimer(), 1000)
    }
  }

  stopTimer() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval)
      this.timerInterval = null
    }
  }

  getCurrentSentence() {
    const sentences = getSentences(this.currentLevel)
    return sentences[this.currentSentenceIndex]
  }

  updateLevel() {
    switch (this.currentLevel) {
      case 'easy':
        this.currentLevel = 'medium'
        break
      case 'medium':
        this.currentLevel = 'hard'
        break
    }
  }

  checkBestTime() {
    if (this.timer < this.bestTime) {
      this.bestTime = this.timer
      storage.setItem('bestTime', this.timer.toString())
      return true
    }
    return false
  }

  nextSentence() {
    this.currentSentenceIndex++
    const sentences = getSentences(this.currentLevel)
    if (this.currentSentenceIndex >= sentences.length) {
      this.currentSentenceIndex = 0
      if (this.currentLevel === 'hard') {
        return false
      }
      this.updateLevel()
    }
    return true
  }

  prepareNewSentence() {
    const sentence = this.getCurrentSentence()
    this.remainingWords = sentence.text
      .split(' ')
      .map((word, index) => ({
        word: word.toLowerCase().replace(/[.,!?]/g, ""),
        index
      }))
    return sentence
  }

  resetGame() {
    this.currentLevel = 'easy'
    this.currentSentenceIndex = 0
    this.timer = 0
    this.remainingWords = []
    this.stopTimer()
  }
}
