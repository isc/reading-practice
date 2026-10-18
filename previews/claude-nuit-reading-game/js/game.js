import { sentences } from "./data.js"

export class GameState {
  constructor() {
    this.currentLevel = "easy"
    this.currentSentenceIndex = 0
    this.timer = 0
    this.timerInterval = null
    this.bestTime = localStorage.getItem("bestTime")
      ? parseInt(localStorage.getItem("bestTime"))
      : Infinity
    this.remainingWords = []
  }

  // Rang de la phrase en cours dans toute la partie (pour les pastilles)
  progress() {
    const levels = Object.keys(sentences)
    return (
      levels
        .slice(0, levels.indexOf(this.currentLevel))
        .reduce((sum, level) => sum + sentences[level].length, 0) +
      this.currentSentenceIndex
    )
  }

  getCurrentSentence() {
    return sentences[this.currentLevel][this.currentSentenceIndex]
  }

  updateTimer() {
    this.timer++
    return this.timer
  }

  updateLevel() {
    if (this.currentLevel === "easy") this.currentLevel = "medium"
    else if (this.currentLevel === "medium") this.currentLevel = "hard"
    return this.currentLevel
  }

  checkBestTime() {
    if (this.timer < this.bestTime) {
      this.bestTime = this.timer
      localStorage.setItem("bestTime", this.timer.toString())
      return true
    }
    return false
  }

  nextSentence() {
    this.currentSentenceIndex++
    if (this.currentSentenceIndex >= sentences[this.currentLevel].length) {
      this.currentSentenceIndex = 0
      if (this.currentLevel === "hard") {
        return false
      }
      this.updateLevel()
    }
    return true
  }

  prepareNewSentence() {
    const sentence = this.getCurrentSentence()
    this.remainingWords = sentence.text.split(" ").map((word, index) => ({
      word: word.toLowerCase().replace(/[.,!?]/g, ""),
      index: index,
    }))
    return sentence
  }

  resetGame() {
    this.currentLevel = "easy"
    this.currentSentenceIndex = 0
    this.timer = 0
    this.remainingWords = []
  }
}
