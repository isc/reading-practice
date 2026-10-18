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

export function startRecognition(onTranscript, onError, onEnd) {
  const recognition = new Recognition()
  recognition.lang = "fr-FR"
  recognition.interimResults = true
  recognition.continuous = true

  recognition.onresult = (event) => {
    const result = event.results[event.results.length - 1]
    onTranscript(result[0].transcript.toLowerCase())
  }

  recognition.onerror = onError
  recognition.onend = onEnd
  recognition.start()

  return recognition
}
