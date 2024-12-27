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
let timer = 0
let timerInterval
let bestTime = localStorage.getItem('bestTime') ? parseInt(localStorage.getItem('bestTime')) : Infinity
let phoneticDict = {}

// Load phonetic dictionary
fetch('fr_FR.txt')
  .then(response => response.text())
  .then(data => {
    const lines = data.split('\n')
    lines.forEach(line => {
      const [word, phonetic] = line.split('\t')
      if (word && phonetic) {
        phoneticDict[word.toLowerCase()] = phonetic.trim()
      }
    })
  })
  .catch(error => console.error('Error loading phonetic dictionary:', error))

function getPhonetic(word) {
  word = word.toLowerCase().replace(/[.,!?]/g, '')
  return phoneticDict[word] || word
}

function displaySentence() {
  const sentence = sentences[currentLevel][currentSentenceIndex]
  const sentenceDiv = document.getElementById('sentence')
  const emojiDiv = document.getElementById('emoji')
  sentenceDiv.innerHTML = ''
  emojiDiv.innerHTML = ''
  document.getElementById('next').style.display = 'none'

  remainingWords = sentence.text
    .split(' ')
    .map((word, index) => ({
      word: word.toLowerCase().replace(/[.,!?]/g, ''),
      index: index
    }))

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

function handleTranscript(transcript) {
  const transcriptWords = transcript.toLowerCase().split(' ')

  for (const transcriptWord of transcriptWords) {
    const transcriptPhonetic = getPhonetic(transcriptWord)

    if (remainingWords.length > 0) {
      const targetPhonetic = getPhonetic(remainingWords[0].word)

      if (transcriptPhonetic === targetPhonetic) {
        const wordElement = document.querySelector(`.word[data-index="${remainingWords[0].index}"]`)
        if (wordElement) {
          wordElement.classList.add('correct')
        }
        remainingWords.shift()

        if (remainingWords.length === 0) {
          const sentence = sentences[currentLevel][currentSentenceIndex]
          const emojiDiv = document.getElementById('emoji')
          emojiDiv.innerHTML = `<span class="large-emoji">${sentence.emoji}</span>`
          recognition.stop()
          document.getElementById('next').style.display = 'inline-block'
          clearInterval(timerInterval)
          showConfetti()
        }
      }
    }
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

function updateLevelDisplay() {
  document.getElementById('level').textContent = `Niveau: ${currentLevel.charAt(0).toUpperCase() + currentLevel.slice(1)}`
}

function updateLevel() {
  if (currentLevel === 'easy') {
    currentLevel = 'medium'
  } else if (currentLevel === 'medium') {
    currentLevel = 'hard'
  }
  updateLevelDisplay()
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
    if (currentLevel === 'hard') {  // Completed hard level
      recognition.stop()
      clearInterval(timerInterval)
      showGameEndMessage()
      document.getElementById('start').style.display = 'block'
      document.getElementById('next').style.display = 'none'
      return
    }
    updateLevel()
  }
  displaySentence()
  startRecognition()
  timerInterval = setInterval(updateTimer, 1000)
})

clickOn('start', () => {
  document.getElementById('start').style.display = 'none'
  document.getElementById('next').style.display = 'none'
  timer = 0
  currentLevel = 'easy'
  currentSentenceIndex = 0
  updateLevelDisplay()
  displaySentence()
  startRecognition()
  timerInterval = setInterval(updateTimer, 1000)
})
