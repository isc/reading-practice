import { describe, it, expect } from 'vitest'
import { handleTranscript } from '../js/speech.js'
import { getPhonetic } from '../js/data.js'

describe('Speech Recognition', () => {
  describe('handleTranscript', () => {
    it('processes correct words', () => {
      const remainingWords = [
        { word: 'chat', index: 0 },
        { word: 'dort', index: 1 }
      ]
      
      let wordCorrectIndex = -1
      let sentenceCompleted = false
      
      const onWordCorrect = (index) => { wordCorrectIndex = index }
      const onSentenceComplete = () => { sentenceCompleted = true }
      
      handleTranscript('le chat', remainingWords, onWordCorrect, onSentenceComplete)
      
      expect(wordCorrectIndex).toBe(0)
      expect(remainingWords.length).toBe(1)
      expect(sentenceCompleted).toBe(false)
    })
    
    it('completes sentence when all words are correct', () => {
      const remainingWords = [
        { word: 'chat', index: 0 }
      ]
      
      let wordCorrectIndex = -1
      let sentenceCompleted = false
      
      const onWordCorrect = (index) => { wordCorrectIndex = index }
      const onSentenceComplete = () => { sentenceCompleted = true }
      
      handleTranscript('chat', remainingWords, onWordCorrect, onSentenceComplete)
      
      expect(wordCorrectIndex).toBe(0)
      expect(remainingWords.length).toBe(0)
      expect(sentenceCompleted).toBe(true)
    })
    
    it('ignores incorrect words', () => {
      const remainingWords = [
        { word: 'chat', index: 0 }
      ]
      
      let wordCorrectIndex = -1
      let sentenceCompleted = false
      
      const onWordCorrect = (index) => { wordCorrectIndex = index }
      const onSentenceComplete = () => { sentenceCompleted = true }
      
      handleTranscript('chien', remainingWords, onWordCorrect, onSentenceComplete)
      
      expect(wordCorrectIndex).toBe(-1)
      expect(remainingWords.length).toBe(1)
      expect(sentenceCompleted).toBe(false)
    })
  })
})
