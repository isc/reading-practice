let players = []
let currentPlayerIndex = 0
let gameStarted = false
let gameEnded = false

// Initialisation
document.addEventListener("DOMContentLoaded", function () {
  // S'assurer que la modal est bien cachée au démarrage
  document.getElementById("winnerModal").classList.add("hidden")
  addNewPlayerInput()
  updateDisplay()
})

function addNewPlayerInput() {
  if (gameStarted) return

  const playersList = document.getElementById("playersList")
  const addPlayerDiv = document.createElement("div")
  addPlayerDiv.className = "add-player"
  addPlayerDiv.innerHTML = `
            <input type="text" placeholder="+ Ajouter un joueur" onkeypress="handlePlayerAdd(event)" onblur="handlePlayerAdd(event)">
        `
  playersList.appendChild(addPlayerDiv)
}

function handlePlayerAdd(event) {
  if (event.type === "keypress" && event.key !== "Enter") return
  if (event.type === "blur" && event.target.value.trim() === "") return

  const name = event.target.value.trim()
  if (name) {
    addPlayer(name)
    event.target.value = ""
    event.target.focus()
  }
}

function addPlayer(name) {
  if (gameStarted) return

  players.push({
    name: name,
    score: 0,
    missCount: 0,
    eliminated: false,
    history: [],
  })
  updateDisplay()
}

function startGame() {
  if (players.length < 2) {
    alert("Il faut au moins 2 joueurs pour commencer!")
    return
  }
  gameStarted = true
  currentPlayerIndex = 0
  document.getElementById("gameStatus").textContent = "En cours"
  updateDisplay()
}

function addScore(playerIndex, points) {
  if (gameEnded || players[playerIndex].eliminated) return

  if (!gameStarted) {
    startGame()
  }

  if (playerIndex !== currentPlayerIndex) return

  const player = players[playerIndex]

  // Reset miss counter si le joueur marque
  if (points > 0) {
    player.missCount = 0
  } else {
    player.missCount++
    if (player.missCount >= 3) {
      player.eliminated = true
      checkGameEnd()
    }
  }

  player.score += points
  player.history.push(points)

  // Règle spéciale: si > 50, retour à 25
  if (player.score > 50) {
    player.score = 25
  }

  // Vérifier la victoire
  if (player.score === 50) {
    showWinner(player.name)
    gameEnded = true
    return
  }

  nextPlayer()
  updateDisplay()
}

function nextPlayer() {
  do {
    currentPlayerIndex = (currentPlayerIndex + 1) % players.length
  } while (
    players[currentPlayerIndex].eliminated &&
    !allPlayersEliminated()
  )

  if (allPlayersEliminated()) {
    checkGameEnd()
  }
}

function allPlayersEliminated() {
  // Éviter de vérifier si le jeu n'a pas commencé ou s'il n'y a pas de joueurs
  if (!gameStarted || players.length === 0) return false
  return players.filter((p) => !p.eliminated).length <= 1
}

function checkGameEnd() {
  // Ne pas vérifier la fin de partie si le jeu n'a pas commencé
  if (!gameStarted || players.length === 0) {
    return
  }

  const remainingPlayers = players.filter((p) => !p.eliminated)

  if (remainingPlayers.length === 1) {
    showWinner(remainingPlayers[0].name)
    gameEnded = true
  } else if (remainingPlayers.length === 0) {
    showWinner("Personne (tous éliminés!)")
    gameEnded = true
  }
}

function showWinner(winnerName) {
  document.getElementById(
    "winnerText"
  ).textContent = `${winnerName} a gagné!`
  document.getElementById("winnerModal").classList.remove("hidden")
  document.getElementById("gameStatus").textContent = "Terminé"
}

function updateDisplay() {
  const playersList = document.getElementById("playersList")
  playersList.innerHTML = ""

  players.forEach((player, index) => {
    const playerDiv = document.createElement("div")
    playerDiv.className = `player-card ${
      index === currentPlayerIndex && gameStarted && !gameEnded
        ? "active"
        : ""
    } ${player.score === 50 ? "winner" : ""} ${
      player.eliminated ? "eliminated" : ""
    }`

    let controlsHTML = ""
    if (
      !gameEnded &&
      !player.eliminated &&
      (!gameStarted || index === currentPlayerIndex)
    ) {
      controlsHTML = `
                    <div class="player-controls">
                        <div class="score-label">Score à ajouter :</div>
                        <input type="number"
                               class="score-input"
                               id="scoreInput${index}"
                               min="0"
                               max="12"
                               placeholder="0-12"
                               onkeypress="handleScoreKeypress(event, ${index})"
                               oninput="validateScoreInput(this)">
                        <button class="add-score-btn" onclick="submitScore(${index})">Valider</button>
                    </div>
                `
    }

    playerDiv.innerHTML = `
                <div class="player-header">
                    <div class="player-name">${player.name}</div>
                    <div class="player-score">${player.score}</div>
                </div>
                ${controlsHTML}
                <div class="player-stats">
                    <span>Tours: ${player.history.length}</span>
                    <span>Zéros: ${
                      player.history.filter((score) => score === 0).length
                    }</span>
                    ${
                      player.missCount > 0
                        ? `<span class="miss-counter">Ratés consécutifs: ${player.missCount}/3</span>`
                        : "<span></span>"
                    }
                </div>
            `

    playersList.appendChild(playerDiv)
  })

  if (!gameStarted && players.length === 0) {
    addNewPlayerInput()
  } else if (!gameStarted) {
    addNewPlayerInput()
  }

  // Focus sur l'input du joueur actif après mise à jour
  if (gameStarted && !gameEnded && players.length > 0) {
    setTimeout(() => {
      const activeInput = document.getElementById(
        `scoreInput${currentPlayerIndex}`
      )
      if (activeInput) {
        activeInput.focus()
      }
    }, 100)
  }
}

function handleScoreKeypress(event, playerIndex) {
  if (event.key === "Enter") {
    submitScore(playerIndex)
  }
}

function validateScoreInput(input) {
  const value = parseInt(input.value)
  if (value < 0) input.value = 0
  if (value > 12) input.value = 12
}

function submitScore(playerIndex) {
  const input = document.getElementById(`scoreInput${playerIndex}`)
  const points = parseInt(input.value) || 0

  addScore(playerIndex, points)
  input.value = "" // Reset l'input après soumission
}

function resetScores() {
  players.forEach((player) => {
    player.score = 0
    player.missCount = 0
    player.eliminated = false
    player.history = []
  })
  currentPlayerIndex = 0
  gameStarted = false
  gameEnded = false
  document.getElementById("gameStatus").textContent = "En attente"
  document.getElementById("winnerModal").classList.add("hidden")
  updateDisplay()
}

function newGame() {
  players = []
  currentPlayerIndex = 0
  gameStarted = false
  gameEnded = false
  document.getElementById("gameStatus").textContent = "En attente"
  document.getElementById("winnerModal").classList.add("hidden")
  updateDisplay()
}

function showRules() {
  document.getElementById("rulesModal").classList.remove("hidden")
}

function hideRules() {
  document.getElementById("rulesModal").classList.add("hidden")
}