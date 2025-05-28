let players = []
let teams = []
let currentTeamId = null
let teamPlayerIndexes = {} // Pour tracker l'index du joueur actuel par équipe
let teamMissCount = {} // Pour tracker les ratés consécutifs par équipe
let gameStarted = false
let gameEnded = false

// Couleurs prédéfinies pour les équipes
const teamColors = [
  { name: "Rouge", color: "#ef4444", bg: "#2a1a1a" },
  { name: "Bleu", color: "#3b82f6", bg: "#1a1f2a" },
  { name: "Vert", color: "#22c55e", bg: "#1a2a1a" },
  { name: "Jaune", color: "#eab308", bg: "#2a2a1a" },
  { name: "Violet", color: "#a855f7", bg: "#251a2a" },
  { name: "Orange", color: "#f97316", bg: "#2a1f1a" },
  { name: "Rose", color: "#ec4899", bg: "#2a1a22" },
  { name: "Cyan", color: "#06b6d4", bg: "#1a252a" },
]

// Initialisation
document.addEventListener("DOMContentLoaded", function () {
  // S'assurer que la modal est bien cachée au démarrage
  document.getElementById("winnerModal").classList.add("hidden")
  updateDisplay()
})

function addNewPlayerInput() {
  if (gameStarted) return

  const playersList = document.getElementById("playersList")
  const addPlayerDiv = document.createElement("div")
  addPlayerDiv.className = "add-player"

  // Créer les options du select pour les équipes
  const teamSelectOptions = generateTeamSelectOptions()

  addPlayerDiv.innerHTML = `
    <div class="player-input-container">
      <select id="teamSelect" class="team-select">
          ${teamSelectOptions}
        </select>
        <input type="text" id="playerNameInput" placeholder="Nom du joueur" class="player-name-input">
      <button type="button" class="add-player-btn">Ajouter</button>
    </div>
  `
  playersList.appendChild(addPlayerDiv)

  // Ajouter les event listeners
  const nameInput = addPlayerDiv.querySelector("#playerNameInput")
  const addBtn = addPlayerDiv.querySelector(".add-player-btn")

  nameInput.addEventListener("keypress", function (event) {
    if (event.key === "Enter") {
      addPlayerFromForm()
    }
  })

  addBtn.addEventListener("click", function () {
    addPlayerFromForm()
  })

  // Focus sur l'input de nom
  nameInput.focus()
}

function generateTeamSelectOptions() {
  const usedTeamIds = new Set(players.map((p) => p.teamId))
  const nextTeamId = getNextAvailableTeamId()

  let options = ""

  const nextTeamColor = teamColors[nextTeamId]
  const nextColorEmoji = getColorEmoji(nextTeamColor.color)
  options += `<option value="${nextTeamId}" selected>${nextColorEmoji}</option>`

  usedTeamIds.forEach((teamId) => {
    const teamColor = teamColors[teamId]
    const colorEmoji = getColorEmoji(teamColor.color)
    options += `<option value="${teamId}">${colorEmoji}</option>`
  })

  return options
}

function getColorEmoji(color) {
  const colorMap = {
    "#ef4444": "🔴",
    "#3b82f6": "🔵",
    "#22c55e": "🟢",
    "#eab308": "🟡",
    "#a855f7": "🟣",
    "#f97316": "🟠",
  }
  return colorMap[color] || "⚪"
}

function addPlayerFromForm() {
  const nameInput = document.getElementById("playerNameInput")
  const teamSelect = document.getElementById("teamSelect")

  const name = nameInput.value.trim()
  if (!name) {
    alert("Veuillez saisir un nom de joueur")
    nameInput.focus()
    return
  }

  const teamId = parseInt(teamSelect.value)
  addPlayer(name, teamId)

  nameInput.value = ""
  teamSelect.innerHTML = generateTeamSelectOptions()
  nameInput.focus()
}

function addStartGameButton() {
  // Vérifier qu'il n'y a pas déjà un bouton
  if (document.querySelector(".start-game-section")) return

  const playersList = document.getElementById("playersList")
  const startGameDiv = document.createElement("div")
  startGameDiv.className = "start-game-section"

  // Compter les équipes
  const uniqueTeams = [...new Set(players.map((p) => p.teamId))]
  const canStart = players.length >= 2 && uniqueTeams.length >= 2

  startGameDiv.innerHTML = `
    <div class="start-game-info">
      <p>${players.length} joueur${players.length > 1 ? "s" : ""} dans ${
    uniqueTeams.length
  } équipe${uniqueTeams.length > 1 ? "s" : ""}</p>
      ${
        !canStart
          ? '<p class="error">Il faut au moins 2 joueurs dans 2 équipes différentes</p>'
          : ""
      }
    </div>
    <button class="btn btn-start-game" onclick="startGame()" ${
      !canStart ? "disabled" : ""
    }>
      🎯 Commencer la partie
    </button>
  `

  playersList.appendChild(startGameDiv)
}

function addPlayer(name, teamId = null) {
  if (gameStarted) return

  // Si aucune équipe spécifiée, créer une nouvelle équipe
  if (teamId === null) {
    teamId = getNextAvailableTeamId()
  }

  players.push({
    name: name,
    score: 0,
    missCount: 0,
    eliminated: false,
    history: [],
    teamId: teamId,
  })
  updatePlayersList()
}

function removePlayer(index) {
  if (gameStarted) return
  
  players.splice(index, 1)
  updatePlayersList()
}

function updatePlayersList() {
  // Mettre à jour seulement la liste des joueurs, pas le formulaire
  const existingPlayers = document.querySelectorAll(
    ".player-card, .simple-player-card"
  )
  existingPlayers.forEach((card) => card.remove())

  // Mettre à jour le bouton de démarrage
  const existingStartSection = document.querySelector(".start-game-section")
  if (existingStartSection) {
    existingStartSection.remove()
  }

  const playersList = document.getElementById("playersList")

  // Afficher les joueurs
  players.forEach((player, index) => {
    const playerDiv = createPlayerCard(player, index)
    // Insérer avant le formulaire d'ajout
    const addPlayerDiv = document.querySelector(".add-player")
    if (addPlayerDiv) {
      playersList.insertBefore(playerDiv, addPlayerDiv)
    } else {
      playersList.appendChild(playerDiv)
    }
  })

  // Ajouter le bouton de démarrage si nécessaire
  if (!gameStarted && players.length > 0) {
    addStartGameButton()
  }
}

function getNextAvailableTeamId() {
  // Trouver le prochain ID d'équipe disponible
  const usedTeamIds = new Set(players.map((p) => p.teamId))
  for (let i = 0; i < teamColors.length; i++) {
    if (!usedTeamIds.has(i)) {
      return i
    }
  }
  // Si toutes les couleurs sont utilisées, réutiliser la première
  return 0
}

function startGame() {
  if (players.length < 2) {
    alert("Il faut au moins 2 joueurs pour commencer!")
    return
  }

  // Vérifier qu'il y a au moins 2 équipes
  const uniqueTeams = [...new Set(players.map((p) => p.teamId))]
  if (uniqueTeams.length < 2) {
    alert("Il faut au moins 2 équipes pour commencer!")
    return
  }

  gameStarted = true
  currentTeamId = uniqueTeams[0]

  // Initialiser les index des joueurs et miss count pour chaque équipe
  teamPlayerIndexes = {}
  teamMissCount = {}
  uniqueTeams.forEach((teamId) => {
    teamPlayerIndexes[teamId] = 0
    teamMissCount[teamId] = 0
  })

  document.getElementById("gameStatus").textContent = "En cours"
  updateDisplay()
}

function addScore(teamId, points) {
  if (gameEnded) return

  if (!gameStarted) {
    startGame()
  }

  if (teamId !== currentTeamId) return

  // Obtenir l'équipe et le joueur actuel
  const teamPlayers = players.filter(
    (p) => p.teamId === teamId && !p.eliminated
  )
  if (teamPlayers.length === 0) return

  const currentPlayerIndex = teamPlayerIndexes[teamId] || 0
  const currentPlayer = teamPlayers[currentPlayerIndex % teamPlayers.length]

  // Gestion des ratés au niveau équipe
  if (points > 0) {
    // Reset le miss counter de l'équipe
    teamMissCount[teamId] = 0
  } else {
    // Augmenter le miss counter de l'équipe
    teamMissCount[teamId]++
    if (teamMissCount[teamId] >= 3) {
      // Éliminer toute l'équipe
      teamPlayers.forEach((player) => (player.eliminated = true))
      checkGameEnd()
    }
  }

  // Ajouter le score à tous les joueurs de l'équipe
  teamPlayers.forEach((player) => {
    player.score += points
    player.history.push(points)

    // Règle spéciale: si > 50, retour à 25
    if (player.score > 50) {
      player.score = 25
    }
  })

  // Vérifier la victoire (n'importe quel joueur de l'équipe atteint 50)
  const teamScore = teamPlayers[0].score
  if (teamScore === 50) {
    const teamColor = teamColors[teamId]
    showWinner(`Équipe ${teamColor.name}`)
    gameEnded = true
    return
  }

  nextTeam()
  updateDisplay()
}

function nextTeam() {
  // Incrémenter l'index du joueur pour l'équipe actuelle
  const currentTeamPlayers = players.filter(
    (p) => p.teamId === currentTeamId && !p.eliminated
  )
  if (currentTeamPlayers.length > 0) {
    teamPlayerIndexes[currentTeamId] =
      (teamPlayerIndexes[currentTeamId] + 1) % currentTeamPlayers.length
  }

  // Passer à l'équipe suivante
  const activeTeams = getActiveTeams()
  if (activeTeams.length === 0) {
    checkGameEnd()
    return
  }

  const currentTeamIndex = activeTeams.indexOf(currentTeamId)
  const nextTeamIndex = (currentTeamIndex + 1) % activeTeams.length
  currentTeamId = activeTeams[nextTeamIndex]

  // Vérifier que la nouvelle équipe n'est pas éliminée
  const newTeamPlayers = players.filter(
    (p) => p.teamId === currentTeamId && !p.eliminated
  )
  if (newTeamPlayers.length === 0) {
    nextTeam() // Passer à l'équipe suivante si celle-ci est éliminée
  }
}

function getActiveTeams() {
  const activeTeams = [
    ...new Set(players.filter((p) => !p.eliminated).map((p) => p.teamId)),
  ]
  return activeTeams
}

function allTeamsEliminated() {
  if (!gameStarted || players.length === 0) return false
  const activeTeams = getActiveTeams()
  return activeTeams.length <= 1
}

function checkGameEnd() {
  if (!gameStarted || players.length === 0) {
    return
  }

  const activeTeams = getActiveTeams()

  if (activeTeams.length === 1) {
    const teamColor = teamColors[activeTeams[0]]
    showWinner(`Équipe ${teamColor.name}`)
    gameEnded = true
  } else if (activeTeams.length === 0) {
    showWinner("Personne (toutes les équipes éliminées!)")
    gameEnded = true
  }
}

function showWinner(winnerName) {
  document.getElementById("winnerText").textContent = `${winnerName} a gagné!`
  document.getElementById("winnerModal").classList.remove("hidden")
  document.getElementById("gameStatus").textContent = "Terminé"
}

function updateDisplay() {
  const playersList = document.getElementById("playersList")
  playersList.innerHTML = ""

  if (gameStarted) {
    // Pendant le jeu, regrouper par équipe
    displayPlayersByTeam(playersList)
  } else {
    // Avant le jeu, affichage simple
    displayPlayersSimple(playersList)

    // Toujours ajouter le formulaire quand le jeu n'a pas commencé
    addNewPlayerInput()

    // Ajouter le bouton de démarrage s'il y a des joueurs
    if (players.length > 0) {
      addStartGameButton()
    }
  }

  // Focus sur l'input de l'équipe active après mise à jour
  if (gameStarted && !gameEnded && currentTeamId !== null) {
    setTimeout(() => {
      const activeInput = document.getElementById(
        `teamScoreInput${currentTeamId}`
      )
      if (activeInput) {
        activeInput.focus()
      }
    }, 100)
  }
}

function displayPlayersSimple(playersList) {
  players.forEach((player, index) => {
    const playerDiv = createPlayerCard(player, index)
    playersList.appendChild(playerDiv)
  })
}

function displayPlayersByTeam(playersList) {
  // Regrouper les joueurs par équipe
  const teamGroups = {}
  players.forEach((player, index) => {
    if (!teamGroups[player.teamId]) {
      teamGroups[player.teamId] = []
    }
    teamGroups[player.teamId].push({ player, index })
  })

  // Afficher chaque équipe
  Object.keys(teamGroups).forEach((teamId) => {
    const teamColor = teamColors[teamId] || teamColors[0]
    const teamPlayers = teamGroups[teamId]
    const currentTeamPlayers = teamPlayers.filter(
      ({ player }) => !player.eliminated
    )

    if (currentTeamPlayers.length === 0) return // Équipe éliminée

    // Créer une carte d'équipe unique
    const teamCard = createTeamCard(parseInt(teamId), teamPlayers)
    playersList.appendChild(teamCard)
  })
}

function createTeamCard(teamId, teamPlayersData) {
  const teamColor = teamColors[teamId] || teamColors[0]
  const teamPlayers = teamPlayersData.map((data) => data.player)
  const activeTeamPlayers = teamPlayers.filter((p) => !p.eliminated)

  const isActiveTeam = teamId === currentTeamId
  const currentPlayerIndex = teamPlayerIndexes[teamId] || 0
  const currentPlayer =
    activeTeamPlayers[currentPlayerIndex % activeTeamPlayers.length]

  // Score de l'équipe (tous les joueurs ont le même score)
  const teamScore =
    activeTeamPlayers.length > 0 ? activeTeamPlayers[0].score : 0

  const teamDiv = document.createElement("div")
  teamDiv.className = `team-card ${
    isActiveTeam && !gameEnded ? "active" : ""
  } ${teamScore === 50 ? "winner" : ""} ${
    activeTeamPlayers.length === 0 ? "eliminated" : ""
  }`

  let controlsHTML = ""
  if (!gameEnded && isActiveTeam && activeTeamPlayers.length > 0) {
    controlsHTML = `
      <div class="team-controls">
        <div class="score-label">Score à ajouter :</div>
        <input type="number"
               class="score-input"
               id="teamScoreInput${teamId}"
               min="0"
               max="12"
               placeholder="0-12"
               onkeypress="handleTeamScoreKeypress(event, ${teamId})"
               oninput="validateScoreInput(this)">
        <button class="add-score-btn" onclick="submitTeamScore(${teamId})">Valider</button>
      </div>
    `
  }

  // Liste des joueurs de l'équipe
  const playersListHTML = teamPlayers
    .map((player) => {
      const isCurrentPlayer = player === currentPlayer && isActiveTeam
      return `<span class="team-player ${
        isCurrentPlayer ? "current-player" : ""
      }">${player.name}</span>`
    })
    .join("")

  // Miss counter de l'équipe
  const missCount = teamMissCount[teamId] || 0

  teamDiv.innerHTML = `
    <div class="team-header-card">
      <div class="team-name-container">
        <div class="team-color-dot" style="background-color: ${teamColor.color}"></div>
        <div class="players-names">${playersListHTML}</div>
      </div>
      <div class="team-score">${teamScore}</div>
    </div>
    ${controlsHTML}
    <div class="team-stats">
      <span>Tours: ${teamPlayers[0]?.history.length || 0}</span>
      <span>Zéros: ${
        teamPlayers[0]?.history.filter((score) => score === 0).length || 0
      }</span>
      ${
        missCount > 0
          ? `<span class="miss-counter">Ratés consécutifs: ${missCount}/3</span>`
          : "<span></span>"
      }
    </div>
  `

  return teamDiv
}

function createPlayerCard(player, index) {
  const teamColor = teamColors[player.teamId] || teamColors[0]
  const playerDiv = document.createElement("div")

  if (!gameStarted) {
    // Affichage simple avant le jeu
    playerDiv.className = "simple-player-card"
    playerDiv.innerHTML = `
      <div class="team-color-dot" style="background-color: ${teamColor.color}"></div>
      <span class="player-name">${player.name}</span>
      <button class="delete-player-btn" onclick="removePlayer(${index})" title="Supprimer ce joueur">✕</button>
    `
  } else {
    // Affichage complet pendant le jeu (pas utilisé actuellement car on utilise displayPlayersByTeam)
    playerDiv.className = `player-card ${player.score === 50 ? "winner" : ""} ${
      player.eliminated ? "eliminated" : ""
    }`

    playerDiv.innerHTML = `
                <div class="player-header">
                    <div class="player-name-container">
                        <div class="team-color-dot" style="background-color: ${teamColor.color}"></div>
                        <div class="player-name">${player.name}</div>
                    </div>
                    <div class="player-score">${player.score}</div>
                </div>
            `
  }

  return playerDiv
}

function handleScoreKeypress(event, playerIndex) {
  if (event.key === "Enter") {
    submitScore(playerIndex)
  }
}

function handleTeamScoreKeypress(event, teamId) {
  if (event.key === "Enter") {
    submitTeamScore(teamId)
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
  input.value = ""
}

function submitTeamScore(teamId) {
  const input = document.getElementById(`teamScoreInput${teamId}`)
  const points = parseInt(input.value) || 0

  addScore(teamId, points)
  input.value = ""
}


function newGame() {
  // Garder les joueurs mais remettre à zéro leurs stats
  players.forEach((player) => {
    player.score = 0
    player.eliminated = false
    player.history = []
  })
  
  currentTeamId = null
  teamPlayerIndexes = {}
  teamMissCount = {}
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
