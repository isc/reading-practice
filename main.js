const sentences = {
  easy: [
    { text: 'Le chat dort sur le canapé.', emoji: '😺' },
    { text: "Il fait beau aujourd'hui.", emoji: '☀️' },
    { text: "J'aime lire des livres intéressants.", emoji: '📚' }
  ],
  medium: [
    { text: "Le petit chat aime le lait, mais le grand chat préfère l'eau.", emoji: '🥛' },
    { text: "La vie est pleine de surprises et d'opportunités à saisir.", emoji: '✨' },
    { text: 'Apprendre une nouvelle langue ouvre de nombreuses portes.', emoji: '🗣️' }
  ],
  hard: [
    { text: "L'intelligence artificielle révolutionne de nombreux secteurs de notre société.", emoji: '🤖' },
    { text: "La biodiversité est essentielle à l'équilibre des écosystèmes de notre planète.", emoji: '🌍' },
    { text: 'Les avancées technologiques nous obligent à repenser notre rapport au travail.', emoji: '💻' }
  ]
}

let currentLevel = 'easy'
let currentSentenceIndex = 0
let recognition
let remainingWords = []
let score = 0
let timer = 0
let timerInterval
let bestTime = localStorage.getItem('bestTime') ? parseInt(localStorage.getItem('bestTime')) : Infinity

// const successSound = new Howl({ src: ['success.wav'], volume: 0.5 })

function displaySentence() {
  const sentence = sentences[currentLevel][currentSentenceIndex]
  const sentenceDiv = document.getElementById('sentence')
  const emojiDiv = document.getElementById('emoji')
  sentenceDiv.innerHTML = ''
  emojiDiv.innerHTML = ''
  document.getElementById('next').style.display = 'none'

  remainingWords = sentence.text
    .split(' ')
    .map(word => word.toLowerCase().replace(/[.,!?]/g, ''))
  score = 0
  updateScore(remainingWords.length)

  sentence.text.split(' ').forEach((word, index) => {
    const span = document.createElement('span')
    span.textContent = word
    span.className = 'word'
    span.setAttribute('data-index', index)
    if (index > 0) {
      sentenceDiv.appendChild(document.createTextNode(' '))
    }
    sentenceDiv.appendChild(span)
  })
}

function updateScore(totalWords) {
  const correctWords = document.querySelectorAll('.word.correct').length
  score = Math.round((correctWords / totalWords) * 100)
  document.getElementById('score').textContent = `Score: ${score}%`
}

function handleTranscript(transcript) {
  while (
    remainingWords.length > 0 &&
    transcript.includes(remainingWords[0])
  ) {
    const wordElement = document.querySelector(
      `.word:not(.correct)[data-index="${document.querySelectorAll('.word.correct').length
      }"]`
    )
    if (wordElement) {
      wordElement.classList.add('correct')
      remainingWords.shift()
      updateScore(remainingWords.length + document.querySelectorAll('.word.correct').length)
    }
  }
  if (remainingWords.length === 0) {
    const sentence = sentences[currentLevel][currentSentenceIndex]
    const emojiDiv = document.getElementById('emoji')
    emojiDiv.innerHTML = `<span class="large-emoji">${sentence.emoji}</span>`
    recognition.stop()
    document.getElementById('next').style.display = 'inline-block'
    showConfetti()
  }
}

function startRecognition() {
  recognition = new (window.SpeechRecognition ||
    window.webkitSpeechRecognition)()
  recognition.lang = 'fr-FR'
  recognition.interimResults = true
  recognition.continuous = true

  recognition.onresult = event => {
    console.log(event.results)
    const result = event.results[event.results.length - 1]
    handleTranscript(result[0].transcript.toLowerCase())
  }

  recognition.onerror = event => {
    console.error('Speech recognition error', event.error)
  }
  recognition.onend = () => {
    console.log('Speech recognition ended')
  }
  console.log('Speech recognition started')
  recognition.start()
}

function updateTimer() {
  timer++
  document.getElementById('timer').textContent = `Temps: ${timer}s`
}

function updateLevel() {
  const levelScore = score  // Score within current level (0-100)
  if (levelScore >= 90) {  // Need 90% accuracy to advance
    if (currentLevel === 'easy') {
      currentLevel = 'medium'
      score = 0
    } else if (currentLevel === 'medium') {
      currentLevel = 'hard'
      score = 0
    }
  }
  document.getElementById('level').textContent = `Niveau: ${currentLevel.charAt(0).toUpperCase() + currentLevel.slice(1)
    }`
}

function checkBestTime() {
  if (timer < bestTime) {
    bestTime = timer
    localStorage.setItem('bestTime', timer.toString())
    return true
  }
  return false
}

function showGameEndMessage() {
  const beatBestTime = checkBestTime()
  const message = beatBestTime
    ? `Félicitations! Nouveau record: ${timer}s!`
    : `Temps: ${timer}s (Record: ${bestTime}s)`
  document.getElementById('timer').textContent = message
}

function clickOn(id, callback) {
  document.getElementById(id).addEventListener('click', callback)
}

clickOn('next', () => {
  currentSentenceIndex++
  if (currentSentenceIndex >= sentences[currentLevel].length) {
    currentSentenceIndex = 0
    updateLevel()
    if (currentLevel === 'hard' && score >= 90) {  // Completed hard level with 90%+ accuracy
      recognition.stop()
      clearInterval(timerInterval)
      showGameEndMessage()
      document.getElementById('start').style.display = 'block'
      document.getElementById('next').style.display = 'none'
      return
    }
  }
  displaySentence()
  startRecognition()
})

clickOn('start', () => {
  displaySentence()
  startRecognition()
  document.getElementById('start').style.display = 'none'
  document.getElementById('next').style.display = 'none'
  timer = 0
  score = 0
  currentLevel = 'easy'
  currentSentenceIndex = 0
  updateLevel()
  timerInterval = setInterval(updateTimer, 1000)
})
