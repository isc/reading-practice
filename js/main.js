import { sentences } from "./data.js"
import { GameState } from "./game.js"
import { canListen, handleTranscript, startRecognition } from "./speech.js"
import * as UI from "./ui.js"

const game = new GameState()
let recognition
let reading = false // une phrase est affichée et pas encore lue en entier
let emojis = []

// Une note par mot, qui monte le long de la phrase (gamme pentatonique)
const NOTES = [523, 587, 659, 784, 880, 1047, 1175, 1319, 1568, 1760]

function tone(freq, at, length = 0.5, volume = 0.07) {
  const ctx = window.Voice && Voice.wake(1500)
  if (!ctx) return
  const t = ctx.currentTime + at
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()
  osc.type = "triangle"
  osc.frequency.value = freq
  gain.gain.setValueAtTime(0, t)
  gain.gain.linearRampToValueAtTime(volume, t + 0.015)
  gain.gain.exponentialRampToValueAtTime(0.0001, t + length)
  osc.connect(gain).connect(ctx.destination)
  osc.start(t)
  osc.stop(t + length + 0.05)
}

const chord = (notes) => notes.forEach((n, i) => tone(NOTES[n], i * 0.09, 0.9))

function startGame() {
  if (!canListen()) return UI.refuse()
  game.resetGame()
  emojis = []
  if (window.Voice) Voice.wake(500)
  if (window.ExitGuard) window.ExitGuard.setActive(true)
  initializeNewSentence()
}

function initializeNewSentence() {
  const sentence = game.prepareNewSentence()
  UI.displaySentence(sentence, game.currentLevel)
  UI.updateSteps(game.progress())
  UI.updateTimerDisplay(game.timer)
  reading = true
  listen()

  clearInterval(game.timerInterval)
  game.timerInterval = setInterval(() => {
    UI.updateTimerDisplay(game.updateTimer())
  }, 1000)
}

function listen() {
  recognition?.stop()
  try {
    recognition = startRecognition({
      onTranscript,
      onDenied: () => {
        UI.setMode("denied")
        UI.refuse()
      },
      onIdle: () => UI.setMode("idle"),
    })
    UI.setMode("listen")
  } catch (error) {
    console.error("Speech recognition error", error)
    UI.setMode("idle")
  }
}

function onTranscript(transcript) {
  UI.heard()
  handleTranscript(
    transcript,
    game.remainingWords,
    (index) => {
      UI.markWordAsCorrect(index)
      tone(NOTES[index % NOTES.length], 0)
    },
    onSentenceComplete,
  )
}

function onSentenceComplete() {
  reading = false
  recognition.stop()
  clearInterval(game.timerInterval)
  const { emoji } = game.getCurrentSentence()
  emojis.push(emoji)
  UI.showSentenceComplete(emoji)
  UI.setMode("next")
  chord([4, 6, 7, 9])
  showConfetti()
}

function nextSentence() {
  const canContinue = game.nextSentence()
  if (!canContinue) {
    if (window.ExitGuard) window.ExitGuard.setActive(false)
    const isBestTime = game.checkBestTime()
    UI.showGameEnd(game.timer, game.bestTime, isBestTime, emojis)
    UI.setMode("replay")
    chord([0, 2, 4, 5, 7, 9])
    if (isBestTime) showConfetti()
    return
  }
  initializeNewSentence()
}

UI.onGo(() => {
  const mode = UI.mode()
  if (mode === "next") nextSentence()
  else if (mode === "start" || mode === "replay") startGame()
  else if (reading && (mode === "idle" || mode === "denied")) listen()
  else if (mode === "denied") UI.refuse()
})

UI.buildSteps(
  Object.entries(sentences).map(([level, list]) => [level, list.length]),
)
UI.showHome(game.bestTime)
UI.setMode(canListen() ? "start" : "denied")

// Écran d'accueil : aucune partie en cours.
if (window.ExitGuard) window.ExitGuard.setActive(false)
