import { describe, it, expect, beforeEach } from 'vitest'
import * as UI from '../js/ui.js'

describe('UI', () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <div id="sentence"></div>
      <div id="emoji"></div>
      <div id="timer">Temps: 0s</div>
      <div id="level">Niveau: Easy</div>
      <button id="start">Commencer</button>
      <button id="next">Suivant</button>
    `
  })

  it('displays sentence correctly', () => {
    const sentence = {
      text: "Le chat dort.",
      emoji: "😺"
    }

    UI.displaySentence(sentence)
    
    const sentenceDiv = document.getElementById('sentence')
    const words = sentenceDiv.querySelectorAll('.word')
    
    expect(words.length).toBe(3)
    expect(words[0].textContent).toBe('Le')
    expect(words[1].textContent).toBe('chat')
    expect(words[2].textContent).toBe('dort.')
  })

  it('marks word as correct', () => {
    document.getElementById('sentence').innerHTML = '<span class="word" data-index="0">test</span>'
    
    UI.markWordAsCorrect(0)
    
    const word = document.querySelector('.word')
    expect(word.classList.contains('correct')).toBe(true)
  })

  it('shows emoji correctly', () => {
    UI.showEmoji('😺')
    
    const emojiDiv = document.getElementById('emoji')
    expect(emojiDiv.innerHTML).toBe('<span class="large-emoji">😺</span>')
  })

  it('updates timer display', () => {
    UI.updateTimerDisplay(42)
    
    const timerDiv = document.getElementById('timer')
    expect(timerDiv.textContent).toBe('Temps: 42s')
  })

  it('updates level display', () => {
    UI.updateLevelDisplay('medium')
    
    const levelDiv = document.getElementById('level')
    expect(levelDiv.textContent).toBe('Niveau: Medium')
  })

  it('shows game end message', () => {
    UI.showGameEndMessage(100, 120, false)
    expect(document.getElementById('timer').textContent).toBe('Temps: 100s (Record: 120s)')
    
    UI.showGameEndMessage(90, 90, true)
    expect(document.getElementById('timer').textContent).toBe('Félicitations! Nouveau record: 90s!')
  })

  it('sets button visibility', () => {
    const button = document.getElementById('start')
    
    UI.setButtonVisibility('start', false)
    expect(button.style.display).toBe('none')
    
    UI.setButtonVisibility('start', true)
    expect(button.style.display).toBe('block')
  })

  it('adds click event listener', () => {
    let clicked = false
    UI.onClick('start', () => clicked = true)
    
    document.getElementById('start').click()
    expect(clicked).toBe(true)
  })

  it('sets up keyboard controls', () => {
    let nextCalled = false
    let startCalled = false
    
    UI.setupKeyboardControls(
      () => nextCalled = true,
      () => startCalled = true
    )
    
    // Test next button (space key)
    document.getElementById('next').style.display = 'block'
    document.dispatchEvent(new KeyboardEvent('keydown', { code: 'Space' }))
    expect(nextCalled).toBe(true)
    
    // Test start button (enter key)
    document.getElementById('next').style.display = 'none'
    document.getElementById('start').style.display = 'block'
    document.dispatchEvent(new KeyboardEvent('keydown', { code: 'Enter' }))
    expect(startCalled).toBe(true)
  })
})
