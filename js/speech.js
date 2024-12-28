import { getPhonetic } from './data.js'

export function handleTranscript(transcript, remainingWords, onWordCorrect, onSentenceComplete) {
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

export function startRecognition(onTranscript, onError, onEnd) {
  // Handle test environment
  if (typeof window === 'undefined' || !window.SpeechRecognition && !window.webkitSpeechRecognition) {
    console.warn('Speech recognition not available')
    return {
      start: () => {},
      stop: () => {},
    }
  }

  const recognition = new (window.SpeechRecognition ||
    window.webkitSpeechRecognition)()
  recognition.lang = "fr-FR"
  recognition.interimResults = true
  recognition.continuous = true

  recognition.onresult = (event) => {
    console.log(event.results)
    const result = event.results[event.results.length - 1]
    onTranscript(result[0].transcript.toLowerCase())
  }

  recognition.onerror = onError
  recognition.onend = onEnd
  
  console.log("Speech recognition started")
  recognition.start()
  
  return recognition
}
