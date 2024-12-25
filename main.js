// ... code existant ...

let isTimedMode = false;
let countdownTimer = null;
let timeLeft = 0;

function calculateTimeLimit(difficulty) {
  // Base de 10 secondes + 2 secondes par niveau
  return 10 + (difficulty * 2);
}

function updateCountdown() {
  const countdownElement = document.getElementById('countdown');
  countdownElement.textContent = timeLeft;
  
  // Ajouter un avertissement visuel quand il reste peu de temps
  if (timeLeft <= 5) {
    countdownElement.parentElement.classList.add('warning');
  } else {
    countdownElement.parentElement.classList.remove('warning');
  }
}

function startCountdown() {
  if (!isTimedMode) return;
  
  // Réinitialiser le compte à rebours
  timeLeft = calculateTimeLimit(currentDifficulty);
  updateCountdown();
  
  // Afficher le compteur
  document.getElementById('timed-mode-countdown').classList.remove('hidden');
  
  // Démarrer le timer
  countdownTimer = setInterval(() => {
    timeLeft--;
    updateCountdown();
    
    if (timeLeft <= 0) {
      clearInterval(countdownTimer);
      handleTimeUp();
    }
  }, 1000);
}

function handleTimeUp() {
  clearInterval(countdownTimer);
  stopRecognition();
  
  // Afficher un message
  const sentence = document.getElementById('sentence');
  sentence.innerHTML = '<div class="time-up-message">Temps écoulé !</div>';
  
  // Cacher le bouton "next" et montrer le bouton "start"
  document.getElementById('next').style.display = 'none';
  document.getElementById('start').style.display = 'block';
  
  // Réinitialiser le score pour cette phrase
  currentScore = 0;
  updateScore();
}

function stopCountdown() {
  if (countdownTimer) {
    clearInterval(countdownTimer);
    countdownTimer = null;
  }
  document.getElementById('timed-mode-countdown').classList.add('hidden');
}

// Ajouter les événements pour le mode chronométré
document.getElementById('timed-mode-toggle').addEventListener('change', (e) => {
  isTimedMode = e.target.checked;
  if (!isTimedMode) {
    stopCountdown();
  }
});

// Modifier les fonctions existantes pour intégrer le compte à rebours
const originalStartGame = startGame;
startGame = function() {
  originalStartGame();
  if (isTimedMode) {
    startCountdown();
  }
};

const originalNextSentence = nextSentence;
nextSentence = function() {
  originalNextSentence();
  if (isTimedMode) {
    startCountdown();
  }
};

const originalStopRecognition = stopRecognition;
stopRecognition = function() {
  originalStopRecognition();
  if (isTimedMode) {
    stopCountdown();
  }
};