const sentences = {
  easy: [
    'Le chat dort sur le canapé.',
    "Il fait beau aujourd'hui.",
    "J'aime lire des livres intéressants."
  ],
  medium: [
    "Le petit chat aime le lait, mais le grand chat préfère l'eau.",
    "La vie est pleine de surprises et d'opportunités à saisir.",
    'Apprendre une nouvelle langue ouvre de nombreuses portes.'
  ],
  hard: [
    "L'intelligence artificielle révolutionne de nombreux secteurs de notre société.",
    "La biodiversité est essentielle à l'équilibre des écosystèmes de notre planète.",
    'Les avancées technologiques nous obligent à repenser notre rapport au travail.'
  ]
}

let currentLevel = 'easy'
let currentSentenceIndex = 0
let recognition
let remainingWords = []
let score = 0
let timer = 0
let timerInterval
let isTimedMode = false
let countdownTimer = null
let timeLeft = 0

const successSound = new Howl({ src: ['success.wav'], volume: 0.5 })

function calculateTimeLimit(level) {
  // Base de 10 secondes + 2 secondes par niveau
  const difficultyMap = {
    'easy': 1,
    'medium': 5,
    'hard': 10
  }
  return 10 + (difficultyMap[level] * 2)
}

function updateCountdown() {
  const countdownElement = document.getElementById('countdown')
  countdownElement.textContent = timeLeft
  
  // Ajouter un avertissement visuel quand il reste peu de temps
  if (timeLeft <= 5) {
    countdownElement.parentElement.classList.add('warning')
  } else {
    countdownElement.parentElement.classList.remove('warning')
  }
}

function startCountdown() {
  if (!isTimedMode) return
  
  // Réinitialiser le compte à rebours
  timeLeft = calculateTimeLimit(currentLevel)
  updateCountdown()
  
  // Afficher le compteur
  document.getElementById('timed-mode-countdown').classList.remove('hidden')
  
  // Démarrer le timer
  countdownTimer = setInterval(() => {
    timeLeft--
    updateCountdown()
    
    if (timeLeft <= 0) {
      clearInterval(countdownTimer)
      handleTimeUp()
    }
  }, 1000)
}

function handleTimeUp() {
  clearInterval(countdownTimer)
  if (recognition) {
    recognition.stop()
  }
  
  // Afficher un message
  const sentence = document.getElementById('sentence')
  sentence.innerHTML = '<div class="time-up-message">Temps écoulé !</div>'
  
  // Cacher le bouton "next" et montrer le bouton "start"
  document.getElementById('next').style.display = 'none'
  document.getElementById('start').style.display = 'block'
  
  // Réinitialiser le score pour cette phrase
  score -= 10
  updateScore()
}

function stopCountdown() {
  if (countdownTimer) {
    clearInterval(countdownTimer)
    countdownTimer = null
  }
  document.getElementById('timed-mode-countdown').classList.add('hidden')
}

// Ajouter les événements pour le mode chronométré
document.getElementById('timed-mode-toggle').addEventListener('change', (e) => {
  isTimedMode = e.target.checked
  if (!isTimedMode) {
    stopCountdown()
  }
})

function displaySentence() {
  const sentence = sentences[currentLevel][currentSentenceIndex]
  const sentenceDiv = document.getElementById('sentence')
  sentenceDiv.innerHTML = ''
  remainingWords = sentence
    .split(' ')
    .map(word => word.toLowerCase().replace(/[.,!?]/g, ''))
  sentence.split(' ').forEach((word, index) => {
    const span = document.createElement('span')
    span.textContent = word
    span.className = 'word'
    span.dataset.index = index
    sentenceDiv.appendChild(span)
  })
  
  // Démarrer le compte à rebours si le mode chronométré est actif
  if (isTimedMode) {
    startCountdown()
  }
}

function startRecognition() {
  recognition = new (window.SpeechRecognition ||
    window.webkitSpeechRecognition)()
  recognition.lang = 'fr-FR'
  recognition.interimResults = true
  // recognition.continuous = true

  recognition.onresult = event => {
    console.log(event.results)
    const result = event.results[event.results.length - 1]
    const transcript = result[0].transcript.toLowerCase()

    while (
      remainingWords.length > 0 &&
      transcript.includes(remainingWords[0])
    ) {
      const recognizedWord = remainingWords.shift()
      const wordElement = document.querySelector(
        `.word:not(.correct)[data-index="${
          document.querySelectorAll('.word.correct').length
        }"]`
      )
      if (wordElement) {
        wordElement.classList.add('correct')
        updateScore()
        successSound.play()
      }
    }

    if (remainingWords.length === 0) {
      recognition.stop()
      if (isTimedMode) {
        stopCountdown()
      }
      showConfetti()
      document.getElementById('next').style.display = 'inline-block'
    }
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

function updateScore() {
  score += 10
  document.getElementById('score').textContent = `Score: ${score}`
}

function updateTimer() {
  timer++
  document.getElementById('timer').textContent = `Temps: ${timer}s`
}

function updateLevel() {
  if (score >= 300) currentLevel = 'hard'
  else if (score >= 150) currentLevel = 'medium'
  document.getElementById('level').textContent = `Niveau: ${
    currentLevel.charAt(0).toUpperCase() + currentLevel.slice(1)
  }`
}

document.getElementById('start').addEventListener('click', () => {
  displaySentence()
  startRecognition()
  document.getElementById('start').style.display = 'none'
  timerInterval = setInterval(updateTimer, 1000)
})

document.getElementById('next').addEventListener('click', () => {
  updateLevel()
  currentSentenceIndex =
    (currentSentenceIndex + 1) % sentences[currentLevel].length
  displaySentence()
  document.getElementById('next').style.display = 'none'
  if (recognition) {
    recognition.stop()
    startRecognition()
  }
})