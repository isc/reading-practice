import { GameState } from './game.js'
import { handleTranscript, startRecognition } from './speech.js'
import * as UI from './ui.js'

const game = new GameState()
let recognition

function startGame() {
  UI.setButtonVisibility("start", false)
  initializeNewSentence()
}

function initializeNewSentence() {
  const sentence = game.prepareNewSentence()
  UI.displaySentence(sentence)
  
  recognition = startRecognition(
    (transcript) => handleTranscript(
      transcript,
      game.remainingWords,
      (index) => UI.markWordAsCorrect(index),
      () => onSentenceComplete(sentence)
    ),
    (error) => console.error("Speech recognition error", error),
    () => console.log("Speech recognition ended")
  )

  game.timerInterval = setInterval(() => {
    UI.updateTimerDisplay(game.updateTimer())
  }, 1000)
}

function onSentenceComplete(sentence) {
  UI.showEmoji(sentence.emoji)
  recognition.stop()
  UI.setButtonVisibility("next", true)
  clearInterval(game.timerInterval)
  showConfetti()
}

function nextSentence() {
  const canContinue = game.nextSentence()
  if (!canContinue) {
    const isBestTime = game.checkBestTime()
    UI.showGameEndMessage(game.timer, game.bestTime, isBestTime)
    UI.setButtonVisibility("start", true)
    UI.setButtonVisibility("next", false)
    return
  }
  
  UI.updateLevelDisplay(game.currentLevel)
  initializeNewSentence()
}

// Set up event listeners
UI.onClick("start", startGame)
UI.onClick("next", nextSentence)
UI.setupKeyboardControls(nextSentence, startGame)

// Initialize UI
UI.updateLevelDisplay(game.currentLevel)
