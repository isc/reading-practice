import { getPhonetic } from "./data.js"

export function handleTranscript(
  transcript,
  remainingWords,
  onWordCorrect,
  onSentenceComplete,
) {
  const transcriptWords = transcript.toLowerCase().split(" ")

  for (const transcriptWord of transcriptWords) {
    const transcriptPhonetic = getPhonetic(transcriptWord)

    if (remainingWords.length > 0) {
      const targetPhonetic = getPhonetic(remainingWords[0].word)

      if (transcriptPhonetic === targetPhonetic) {
        onWordCorrect(remainingWords[0].index)
        remainingWords.shift()
        if (remainingWords.length === 0) {
          onSentenceComplete()
        }
      }
    }
  }
}

const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition

export const canListen = () => Boolean(Recognition)

// Écoute en continu : le navigateur coupe le micro après un silence, on le
// relance tant qu'on ne l'a pas arrêté, sauf s'il se coupe en boucle (onIdle)
// ou que le micro est refusé (onDenied).
export function startRecognition({ onTranscript, onDenied, onIdle }) {
  const recognition = new Recognition()
  recognition.lang = "fr-FR"
  recognition.interimResults = true
  recognition.continuous = true
  let stopped = false
  let restarts = 0

  recognition.onresult = (event) => {
    restarts = 0
    const result = event.results[event.results.length - 1]
    onTranscript(result[0].transcript.toLowerCase())
  }

  recognition.onerror = (event) => {
    if (
      event.error === "not-allowed" ||
      event.error === "service-not-allowed"
    ) {
      stopped = true
      onDenied()
    }
  }

  recognition.onend = () => {
    if (stopped) return
    try {
      if (restarts++ < 3) return recognition.start()
    } catch {}
    stopped = true
    onIdle()
  }

  recognition.start()

  return {
    stop() {
      stopped = true
      recognition.stop()
    },
  }
}
