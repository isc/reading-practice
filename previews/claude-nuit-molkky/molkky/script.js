let players = []
let currentTeamId = null
let teamPlayerIndexes = {} // Pour tracker l'index du joueur actuel par équipe
let teamMissCount = {} // Pour tracker les ratés consécutifs par équipe
let gameStarted = false
let gameEnded = false

function serializeState() {
  return JSON.stringify({
    players,
    currentTeamId,
    teamPlayerIndexes,
    teamMissCount,
    gameStarted,
    gameEnded,
  })
}

function saveState() {
  localStorage.setItem("molkkyState", serializeState())
}

function loadState() {
  const saved = localStorage.getItem("molkkyState")
  if (saved) applyState(JSON.parse(saved))
}

function applyState(state) {
  players = state.players || []
  currentTeamId = state.currentTeamId
  teamPlayerIndexes = state.teamPlayerIndexes || {}
  teamMissCount = state.teamMissCount || {}
  gameStarted = state.gameStarted || false
  gameEnded = state.gameEnded || false
}

// Couleurs des équipes : des LED franches, lisibles sur fond noir en plein
// soleil.
const teamColors = [
  { name: "Rouge", color: "#ff4040" },
  { name: "Bleu", color: "#3d9cff" },
  { name: "Vert", color: "#3dff7e" },
  { name: "Jaune", color: "#ffd21f" },
  { name: "Violet", color: "#c46cff" },
  { name: "Orange", color: "#ff8c1a" },
  { name: "Rose", color: "#ff52b4" },
  { name: "Cyan", color: "#26e8ff" },
]
const colorOf = (teamId) => (teamColors[teamId] || teamColors[0]).color

// Disposition des quilles sur le terrain, vue du lanceur : le plan des règles.
const PIN_ROWS = [
  [7, 9, 8],
  [5, 11, 12, 6],
  [3, 10, 4],
  [1, 2],
]

const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)").matches
const $ = (id) => document.getElementById(id)

// ---------------------------------------------------------------------------
// Règles du jeu (inchangées)

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
  saveState()
}

function removePlayer(index) {
  if (gameStarted) return

  players.splice(index, 1)
  saveState()
}

function getNextAvailableTeamId() {
  const usedTeamIds = new Set(players.map((p) => p.teamId))
  for (let i = 0; i < teamColors.length; i++) {
    if (!usedTeamIds.has(i)) {
      return i
    }
  }
  // Si toutes les couleurs sont utilisées, réutiliser la première
  return 0
}

const teamIds = () => [...new Set(players.map((p) => p.teamId))]
const canStart = () => players.length >= 2 && teamIds().length >= 2

function startGame() {
  if (!canStart()) return
  const uniqueTeams = teamIds()

  gameStarted = true
  currentTeamId = uniqueTeams[0]

  // Initialiser les index des joueurs et miss count pour chaque équipe
  teamPlayerIndexes = {}
  teamMissCount = {}
  uniqueTeams.forEach((teamId) => {
    teamPlayerIndexes[teamId] = 0
    teamMissCount[teamId] = 0
  })
  saveState()
}

// Joue un lancer de l'équipe en cours. Rend ce qu'il s'est passé, pour
// l'animer : si l'équipe a dépassé 50 ou vient d'être éliminée.
function addScore(teamId, points) {
  if (gameEnded || teamId !== currentTeamId) return null

  const teamPlayers = players.filter(
    (p) => p.teamId === teamId && !p.eliminated,
  )
  if (teamPlayers.length === 0) return null

  const from = teamPlayers[0].score
  let eliminated = false

  // Gestion des ratés au niveau équipe
  if (points > 0) {
    teamMissCount[teamId] = 0
  } else {
    teamMissCount[teamId]++
    if (teamMissCount[teamId] >= 3) {
      // Éliminer toute l'équipe
      teamPlayers.forEach((player) => (player.eliminated = true))
      eliminated = true
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

  const result = { overflow: from + points > 50, eliminated }

  // Vérifier la victoire (n'importe quel joueur de l'équipe atteint 50)
  if (teamPlayers[0].score === 50) {
    gameEnded = true
    saveState()
    return result
  }

  nextTeam()
  saveState()
  return result
}

function nextTeam() {
  // Incrémenter l'index du joueur pour l'équipe actuelle
  const currentTeamPlayers = players.filter(
    (p) => p.teamId === currentTeamId && !p.eliminated,
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
  currentTeamId = activeTeams[(currentTeamIndex + 1) % activeTeams.length]
}

function getActiveTeams() {
  return [...new Set(players.filter((p) => !p.eliminated).map((p) => p.teamId))]
}

function checkGameEnd() {
  if (!gameStarted || players.length === 0) return
  if (getActiveTeams().length <= 1) gameEnded = true
}

// L'équipe gagnante : celle qui a 50, sinon la dernière encore en jeu.
function winnerTeamId() {
  const fifty = players.find((p) => !p.eliminated && p.score === 50)
  if (fifty) return fifty.teamId
  const active = getActiveTeams()
  return active.length === 1 ? active[0] : null
}

function newGame() {
  // Remet à zéro les scores, éliminations, historiques, et compteurs
  players.forEach((player) => {
    player.score = 0
    player.eliminated = false
    player.history = []
    player.missCount = 0
  })
  currentTeamId = null
  teamPlayerIndexes = {}
  teamMissCount = {}
  gameStarted = false
  gameEnded = false
  undoStack.length = 0
  saveState()
}

function teamState(teamId) {
  const members = players.filter((p) => p.teamId === teamId)
  const active = members.filter((p) => !p.eliminated)
  const ref = active[0] || members[0]
  return {
    members,
    active,
    score: ref ? ref.score : 0,
    history: ref ? ref.history : [],
    eliminated: members.length > 0 && active.length === 0,
    current: active[(teamPlayerIndexes[teamId] || 0) % (active.length || 1)],
  }
}

// ---------------------------------------------------------------------------
// Les LED : chiffres en matrice de points 5 × 7, dessinés sur un canvas.
// Quand le score change, les points allumés s'envolent vers leur nouvelle
// place : le nombre se recompose sous les yeux.

const GLYPHS = {
  0: ["01110", "10001", "10001", "10001", "10001", "10001", "01110"],
  1: ["00100", "01100", "00100", "00100", "00100", "00100", "01110"],
  2: ["01110", "10001", "00001", "00010", "00100", "01000", "11111"],
  3: ["11111", "00010", "00100", "00010", "00001", "10001", "01110"],
  4: ["00010", "00110", "01010", "10010", "11111", "00010", "00010"],
  5: ["11111", "10000", "11110", "00001", "00001", "10001", "01110"],
  6: ["00110", "01000", "10000", "11110", "10001", "10001", "01110"],
  7: ["11111", "00001", "00010", "00100", "01000", "01000", "01000"],
  8: ["01110", "10001", "10001", "01110", "10001", "10001", "01110"],
  9: ["01110", "10001", "10001", "01111", "00001", "00010", "01100"],
}
const COLS = 11 // deux chiffres de 5 colonnes, une colonne d'écart
const ROWS = 7

// Les points allumés d'un nombre de 0 à 99, calé à droite comme sur un vrai
// tableau ; -1 éteint tout.
function cellsOf(value) {
  if (value < 0) return []
  const cells = []
  const digits =
    value < 10 ? [null, value] : [Math.floor(value / 10), value % 10]
  digits.forEach((d, i) => {
    if (d === null) return
    GLYPHS[d].forEach((line, r) => {
      for (let c = 0; c < 5; c++) {
        if (line[c] === "1") cells.push({ c: c + i * 6, r })
      }
    })
  })
  return cells
}

// Un point lumineux pré-dessiné par couleur : cœur blanc, couleur, halo.
// Pas de filtre ni d'ombre à chaque image.
const sprites = new Map()
function spriteOf(color) {
  if (sprites.has(color)) return sprites.get(color)
  const s = document.createElement("canvas")
  s.width = s.height = 64
  const g = s.getContext("2d")
  const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32)
  grad.addColorStop(0, "#fff")
  grad.addColorStop(0.16, color)
  grad.addColorStop(0.4, color)
  grad.addColorStop(0.47, color + "70")
  grad.addColorStop(0.7, color + "22")
  grad.addColorStop(1, color + "00")
  g.fillStyle = grad
  g.fillRect(0, 0, 64, 64)
  sprites.set(color, s)
  return s
}

const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2)
const clamp01 = (t) => Math.max(0, Math.min(1, t))

// Une seule boucle d'animation pour tout ce qui bouge.
const animated = new Set()
let looping = false
function animate(thing) {
  animated.add(thing)
  if (!looping) {
    looping = true
    requestAnimationFrame(tick)
  }
}
function tick(now) {
  animated.forEach((thing) => {
    if (!thing.step(now)) animated.delete(thing)
  })
  if (animated.size) requestAnimationFrame(tick)
  else looping = false
}

class Led {
  constructor(canvas, color) {
    this.canvas = canvas
    this.ctx = canvas.getContext("2d")
    this.color = color
    this.value = null
    this.lit = []
    this.anim = null
    this.pulse = false
  }

  resize() {
    const dpr = window.devicePixelRatio || 1
    const w = this.canvas.clientWidth
    const h = this.canvas.clientHeight
    const size = `${w}×${h}×${dpr}`
    if (!w || !h || size === this.size) return
    this.size = size
    this.canvas.width = Math.round(w * dpr)
    this.canvas.height = Math.round(h * dpr)
    // Une demi-case de marge tout autour, pour le halo.
    this.pitch = Math.min(w / (COLS + 1), h / (ROWS + 1)) * dpr
    this.ox = (this.canvas.width - COLS * this.pitch) / 2 + this.pitch / 2
    this.oy = (this.canvas.height - ROWS * this.pitch) / 2 + this.pitch / 2
    this.paintGrid()
  }

  setColor(color) {
    this.color = color
    if (this.pitch) this.paintGrid()
  }

  // Les LED éteintes, la grille du tableau : peintes une fois, recopiées à
  // chaque image.
  paintGrid() {
    const p = this.pitch
    this.grid = document.createElement("canvas")
    this.grid.width = this.canvas.width
    this.grid.height = this.canvas.height
    const g = this.grid.getContext("2d")
    g.fillStyle = this.color + "26"
    g.beginPath()
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const x = this.ox + c * p
        const y = this.oy + r * p
        g.moveTo(x + p * 0.34, y)
        g.arc(x, y, p * 0.34, 0, Math.PI * 2)
      }
    }
    g.fill()
    this.draw(performance.now())
  }

  // mode : "none" (d'un coup), "morph" (les points volent vers le nouveau
  // nombre), "fall" (ils tombent, puis le nouveau s'allume de haut en bas ;
  // rien ne revient si value vaut -1).
  set(value, mode = "none") {
    const prev = this.lit
    const next = cellsOf(value)
    const changed = value !== this.value
    this.value = value
    this.lit = next
    if (reducedMotion || mode === "none" || !changed) {
      this.anim = null
      this.draw(performance.now())
      return
    }
    const particles = []
    if (mode === "morph" && prev.length && next.length) {
      // Chaque point d'arrivée part d'un point de départ, dans l'ordre des
      // colonnes : les points glissent de gauche à droite, se séparent ou se
      // rejoignent selon qu'il en faut plus ou moins.
      const order = (a, b) => a.c - b.c || a.r - b.r
      const a = [...prev].sort(order)
      const b = [...next].sort(order)
      const n = Math.max(a.length, b.length)
      for (let i = 0; i < n; i++) {
        const s = a[Math.floor((i * a.length) / n)]
        const d = b[Math.floor((i * b.length) / n)]
        particles.push({
          s,
          d,
          delay: (i / n) * 220 + Math.random() * 60,
          arc: (Math.random() - 0.5) * 3,
        })
      }
      this.anim = {
        mode: "morph",
        start: performance.now(),
        particles,
        dur: 900,
      }
    } else {
      prev.forEach((s) =>
        particles.push({
          s,
          vx: (Math.random() - 0.5) * 0.004,
          delay: Math.random() * 180 + (ROWS - s.r) * 20,
        }),
      )
      this.anim = {
        mode: "fall",
        start: performance.now(),
        particles,
        dur: next.length ? 1300 : 900,
      }
    }
    animate(this)
  }

  // Le nombre gagnant scintille quelques secondes, puis reste allumé : pas
  // d'animation sans fin pendant que le téléphone traîne sur la table.
  setPulse(on) {
    this.pulse = on && !reducedMotion
    this.pulseUntil = performance.now() + 4000
    if (this.pulse) animate(this)
  }

  step(now) {
    this.draw(now)
    if (this.anim && now - this.anim.start > this.anim.dur) {
      this.anim = null
      this.draw(now)
    }
    if (this.pulse && now > this.pulseUntil) {
      this.pulse = false
      this.draw(now)
    }
    return !!this.anim || this.pulse
  }

  dot(sprite, c, r, alpha = 1) {
    const p = this.pitch
    const size = p * 2
    this.ctx.globalAlpha = alpha
    this.ctx.drawImage(
      sprite,
      this.ox + c * p - size / 2,
      this.oy + r * p - size / 2,
      size,
      size,
    )
  }

  draw(now) {
    const { ctx, pitch: p } = this
    if (!p) return
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)
    ctx.globalAlpha = 1
    ctx.drawImage(this.grid, 0, 0)
    const sprite = spriteOf(this.color)
    const anim = this.anim
    if (!anim) {
      this.lit.forEach(({ c, r }) => {
        const a = this.pulse
          ? 0.85 + 0.15 * Math.sin(now / 140 - c * 0.6 + r * 0.2)
          : 1
        this.dot(sprite, c, r, a)
      })
    } else if (anim.mode === "morph") {
      const t0 = now - anim.start
      anim.particles.forEach(({ s, d, delay, arc }) => {
        const t = easeInOut(clamp01((t0 - delay) / 600))
        const c = s.c + (d.c - s.c) * t
        const r = s.r + (d.r - s.r) * t - Math.sin(Math.PI * t) * arc
        this.dot(sprite, c, r)
      })
    } else {
      const t0 = now - anim.start
      // Les anciens points tombent hors du tableau en s'éteignant.
      anim.particles.forEach(({ s, vx, delay }) => {
        const t = Math.max(0, t0 - delay)
        const r = s.r + 0.00004 * t * t
        if (r > ROWS + 1) return
        this.dot(sprite, s.c + vx * t, r, 1 - clamp01(t / 700))
      })
      // Puis le nouveau nombre s'allume ligne par ligne.
      if (anim.mode === "fall") {
        this.lit.forEach(({ c, r }) => {
          const a = clamp01((t0 - 750 - r * 60) / 120)
          if (a > 0) this.dot(sprite, c, r, a)
        })
      }
    }
    ctx.globalAlpha = 1
  }
}

// ---------------------------------------------------------------------------
// Les étincelles : un calque plein écran pour les points qui volent des
// quilles vers le tableau, et le feu d'artifice de la victoire.

const sparks = {
  particles: [],
  canvas: null,
  ctx: null,
  init() {
    this.canvas = $("sparks")
    this.ctx = this.canvas.getContext("2d")
    this.resize()
  },
  // Calque plein écran : une densité de 2 suffit pour des points flous.
  resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    this.dpr = dpr
    this.canvas.width = innerWidth * dpr
    this.canvas.height = innerHeight * dpr
  },
  // Des points partent de chaque quille touchée et filent vers le score.
  stream(froms, to, color, onArrive) {
    const now = performance.now()
    let last = 0
    froms.forEach((f, i) => {
      for (let k = 0; k < 5; k++) {
        const delay = i * 70 + k * 35
        last = Math.max(last, delay)
        this.particles.push({
          kind: "stream",
          color,
          start: now + delay,
          dur: 520,
          x0: f.x + (Math.random() - 0.5) * 16,
          y0: f.y + (Math.random() - 0.5) * 16,
          x1: to.x + (Math.random() - 0.5) * to.w * 0.6,
          y1: to.y + (Math.random() - 0.5) * to.h * 0.5,
          bend: (Math.random() - 0.5) * 160,
          size: 16,
        })
      }
    })
    setTimeout(onArrive, last + 480)
    animate(this)
  },
  burst(x, y, color, n = 40) {
    const now = performance.now()
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2
      const v = 0.15 + Math.random() * 0.35
      this.particles.push({
        kind: "burst",
        color,
        start: now,
        dur: 1100 + Math.random() * 500,
        x0: x,
        y0: y,
        vx: Math.cos(a) * v,
        vy: Math.sin(a) * v,
        size: 10 + Math.random() * 10,
      })
    }
    animate(this)
  },
  step(now) {
    const { ctx, dpr } = this
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)
    this.particles = this.particles.filter((p) => now < p.start + p.dur)
    this.particles.forEach((p) => {
      const t = (now - p.start) / p.dur
      if (t < 0) return
      let x
      let y
      let a = 1
      if (p.kind === "stream") {
        const e = easeInOut(t)
        // Une courbe de Bézier : le point s'élève puis plonge vers le score.
        const mx = (p.x0 + p.x1) / 2 + p.bend
        const my = Math.min(p.y0, p.y1) - 60
        x = (1 - e) ** 2 * p.x0 + 2 * (1 - e) * e * mx + e * e * p.x1
        y = (1 - e) ** 2 * p.y0 + 2 * (1 - e) * e * my + e * e * p.y1
        a = t > 0.85 ? (1 - t) / 0.15 : 1
      } else {
        const ms = now - p.start
        x = p.x0 + p.vx * ms
        y = p.y0 + p.vy * ms + 0.00018 * ms * ms
        a = 1 - t
      }
      ctx.globalAlpha = a
      const s = p.size * dpr
      ctx.drawImage(spriteOf(p.color), x * dpr - s / 2, y * dpr - s / 2, s, s)
    })
    ctx.globalAlpha = 1
    return this.particles.length > 0
  },
}

// ---------------------------------------------------------------------------
// Les sons, synthétisés, par le contexte audio de voix.js (débloqué au
// toucher, y compris sur iPhone).

let soundOn = localStorage.getItem("molkkySon") !== "off"

function tone(freq, at, dur, { type = "square", vol = 0.06, to } = {}) {
  if (!soundOn || !window.Voice) return
  const ctx = Voice.context()
  if (!ctx) return
  const t = ctx.currentTime + at
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()
  osc.type = type
  osc.frequency.setValueAtTime(freq, t)
  if (to) osc.frequency.exponentialRampToValueAtTime(to, t + dur)
  gain.gain.setValueAtTime(0, t)
  gain.gain.linearRampToValueAtTime(vol, t + 0.01)
  gain.gain.exponentialRampToValueAtTime(0.0001, t + dur)
  osc.connect(gain).connect(ctx.destination)
  osc.start(t)
  osc.stop(t + dur + 0.02)
}

const note = (n) => 440 * 2 ** ((n - 9) / 12) // n demi-tons au-dessus du do 4

const sounds = {
  pin(n, on) {
    tone(note(n + 12), 0, 0.07, { vol: on ? 0.05 : 0.03 })
  },
  // Un bip par point, qui monte : on entend le score grimper.
  points(k) {
    for (let i = 0; i < k; i++) tone(note(12 + i * 2), 0.12 + i * 0.045, 0.06)
  },
  miss() {
    tone(196, 0, 0.16, { type: "sawtooth", vol: 0.05 })
    tone(147, 0.18, 0.28, { type: "sawtooth", vol: 0.05 })
  },
  overflow() {
    tone(880, 0, 0.7, { type: "triangle", vol: 0.09, to: 220 })
  },
  out() {
    tone(392, 0, 0.9, { type: "sawtooth", vol: 0.05, to: 65 })
  },
  win() {
    ;[0, 4, 7, 12, 7, 12, 16].forEach((n, i) =>
      tone(note(12 + n), i * 0.11, i === 6 ? 0.6 : 0.12, { vol: 0.06 }),
    )
  },
}

function updateSoundBtn() {
  $("soundBtn").classList.toggle("muted", !soundOn)
  $("soundBtn").setAttribute("aria-pressed", String(soundOn))
}

// ---------------------------------------------------------------------------
// Avant la partie : composer les équipes

let chosenTeamId = 0

function renderSetup() {
  const counts = {}
  players.forEach((p) => (counts[p.teamId] = (counts[p.teamId] || 0) + 1))

  $("chips").replaceChildren(
    ...teamColors.map((team, id) => {
      const chip = document.createElement("button")
      chip.type = "button"
      chip.className = "chip"
      chip.style.setProperty("--c", team.color)
      chip.setAttribute("role", "radio")
      chip.setAttribute("aria-label", team.name)
      chip.setAttribute("aria-checked", String(id === chosenTeamId))
      chip.classList.toggle("used", !!counts[id])
      if (counts[id]) chip.textContent = counts[id]
      chip.addEventListener("click", () => {
        chosenTeamId = id
        renderSetup()
        $("playerNameInput").focus()
      })
      return chip
    }),
  )

  const roster = teamIds().map((teamId) => {
    const line = document.createElement("div")
    line.className = "team-line"
    line.style.setProperty("--c", colorOf(teamId))
    players.forEach((p, index) => {
      if (p.teamId !== teamId) return
      const tag = document.createElement("span")
      tag.className = "player-tag"
      const name = document.createElement("span")
      name.textContent = p.name
      const del = document.createElement("button")
      del.type = "button"
      del.className = "del-btn"
      del.setAttribute("aria-label", `Retirer ${p.name}`)
      del.innerHTML =
        '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 7l10 10M17 7 7 17"/></svg>'
      del.addEventListener("click", () => {
        removePlayer(index)
        if (!players.some((q) => q.teamId === chosenTeamId)) {
          chosenTeamId = getNextAvailableTeamId()
        }
        renderSetup()
      })
      tag.append(name, del)
      line.append(tag)
    })
    return line
  })
  // Il faut deux équipes : des places vides le montrent.
  for (let i = roster.length; i < 2; i++) {
    const ghost = document.createElement("div")
    ghost.className = "team-line ghost"
    roster.push(ghost)
  }
  $("roster").replaceChildren(...roster)
  $("startBtn").disabled = !canStart()
}

function shake(el) {
  el.classList.remove("shake")
  void el.offsetWidth
  el.classList.add("shake")
}

function onAddPlayer(event) {
  event.preventDefault()
  const input = $("playerNameInput")
  const name = input.value.trim()
  if (!name) {
    shake(input)
    input.focus()
    return
  }
  addPlayer(name, chosenTeamId)
  sounds.pin(players.length, true)
  input.value = ""
  chosenTeamId = getNextAvailableTeamId()
  renderSetup()
  input.focus()
}

// ---------------------------------------------------------------------------
// Pendant la partie : le tableau

const rows = new Map() // teamId → { el, led, names, misses, gauge, history }
const selected = new Set()
const undoStack = []
let busy = false

function buildBoard() {
  const board = $("board")
  board.replaceChildren()
  rows.clear()
  const ids = teamIds()
  // À plus de trois équipes, des tuiles sur deux colonnes : les chiffres
  // restent grands.
  board.classList.toggle("tiles", ids.length > 3)
  ids.forEach((teamId) => {
    const el = document.createElement("div")
    el.className = "row"
    el.style.setProperty("--c", colorOf(teamId))
    el.innerHTML = `
      <div class="info">
        <div class="names"></div>
        <div class="gauge"><div class="gauge-fill"></div></div>
        <div class="history"></div>
      </div>
      <div class="misses"><i></i><i></i><i></i></div>
      <canvas class="led"></canvas>`
    board.append(el)
    const led = new Led(el.querySelector("canvas"), colorOf(teamId))
    rows.set(teamId, {
      el,
      led,
      names: el.querySelector(".names"),
      misses: [...el.querySelectorAll(".misses i")],
      gauge: el.querySelector(".gauge-fill"),
      history: el.querySelector(".history"),
    })
  })
  sizeLeds()
}

// La hauteur des rangées dépend du nombre d'équipes et de l'écran : les
// chiffres prennent toute la place qu'ils peuvent.
function sizeLeds() {
  const tiles = $("board").classList.contains("tiles")
  rows.forEach(({ el, led }) => {
    const h = tiles
      ? Math.min(
          el.clientHeight - el.querySelector(".info").offsetHeight - 18,
          (el.clientWidth - 20) / 1.5,
          112,
        )
      : Math.min(el.clientHeight - 12, 112)
    led.canvas.style.height = h + "px"
    led.canvas.style.width = h * 1.5 + "px"
    led.resize()
  })
}

function renderBoard(anim = {}) {
  rows.forEach((row, teamId) => {
    const team = teamState(teamId)
    const isActive = teamId === currentTeamId && !gameEnded
    row.el.classList.toggle("active", isActive)
    row.el.classList.toggle("out", team.eliminated)

    row.names.replaceChildren(
      ...team.members.map((p) => {
        const s = document.createElement("span")
        s.textContent = p.name
        if (isActive && p === team.current) s.className = "current"
        return s
      }),
    )
    const misses = team.eliminated ? 3 : teamMissCount[teamId] || 0
    row.misses.forEach((m, i) => m.classList.toggle("on", i < misses))
    row.gauge.style.transform = `scaleX(${team.score / 50})`
    row.history.replaceChildren(
      ...team.history.slice(-8).map((v) => {
        const s = document.createElement("span")
        s.textContent = v
        if (v === 0) s.className = "zero"
        return s
      }),
    )

    const mode = anim.teamId === teamId ? anim.mode : anim.all || "none"
    row.led.set(team.eliminated ? -1 : team.score, mode)
  })

  const team = teamState(currentTeamId)
  const color = colorOf(currentTeamId)
  $("game").style.setProperty("--c", color)
  $("turnName").textContent = team.current ? team.current.name : ""
  $("undoBtn").disabled = undoStack.length === 0
}

function buildPins() {
  // Le pavé range les quilles de 1 à 12 : après quelques lancers, elles ne
  // sont plus à leur place de départ, on y cherche juste un numéro.
  for (let n = 1; n <= 12; n++) {
    const pin = document.createElement("button")
    pin.type = "button"
    pin.className = "pin"
    pin.textContent = n
    pin.dataset.n = n
    pin.setAttribute("aria-pressed", "false")
    pin.addEventListener("click", () => togglePin(pin))
    $("pins").append(pin)
  }
  PIN_ROWS.forEach((line, y) => {
    line.forEach((n, i) => {
      const pin = document.createElement("span")
      pin.className = "pin"
      pin.textContent = n
      pin.style.setProperty("--x", i + (4 - line.length) / 2)
      pin.style.setProperty("--y", y)
      $("rulesPins").append(pin)
    })
  })
}

const pinButtons = () => [...$("pins").querySelectorAll(".pin")]

// Une quille seule vaut son numéro ; plusieurs valent leur nombre.
function pointsOf(pins) {
  if (pins.size === 1) return [...pins][0]
  return pins.size
}

function togglePin(pin) {
  if (busy) return
  Voice.wake(400)
  const n = Number(pin.dataset.n)
  const on = !selected.has(n)
  if (on) selected.add(n)
  else selected.delete(n)
  pin.setAttribute("aria-pressed", String(on))
  sounds.pin(n, on)
  renderThrowBtn()
}

function renderThrowBtn() {
  const btn = $("throwBtn")
  btn.classList.toggle("has-points", selected.size > 0)
  $("throwPoints").textContent = selected.size ? "+" + pointsOf(selected) : ""
}

function clearPins() {
  selected.clear()
  pinButtons().forEach((p) => p.setAttribute("aria-pressed", "false"))
  renderThrowBtn()
}

function rectCenter(el) {
  const r = el.getBoundingClientRect()
  return {
    x: r.left + r.width / 2,
    y: r.top + r.height / 2,
    w: r.width,
    h: r.height,
  }
}

function onThrow() {
  if (busy || gameEnded) return
  Voice.wake(2500)
  const teamId = currentTeamId
  const row = rows.get(teamId)
  const points = pointsOf(selected)
  const froms = pinButtons()
    .filter((p) => selected.has(Number(p.dataset.n)))
    .map(rectCenter)

  undoStack.push(serializeState())
  const result = addScore(teamId, points)
  if (!result) {
    undoStack.pop()
    return
  }
  busy = true

  const land = () => {
    clearPins()
    let mode = "morph"
    if (result.eliminated) {
      mode = "fall"
      sounds.out()
    } else if (result.overflow) {
      mode = "fall"
      sounds.overflow()
    } else if (points === 0) {
      sounds.miss()
    }
    renderBoard({ teamId, mode })
    if (points === 0) {
      shake(row.el)
      const m = row.misses[(teamMissCount[teamId] || 3) - 1]
      if (m) shake(m)
    }
    const wait = reducedMotion ? 0 : mode === "morph" ? 650 : 1100
    setTimeout(
      () => {
        busy = false
        if (gameEnded) showWinner(true)
      },
      gameEnded ? wait + 250 : 150,
    )
  }

  if (points > 0) sounds.points(points)
  if (points > 0 && !reducedMotion) {
    sparks.stream(froms, rectCenter(row.led.canvas), colorOf(teamId), land)
  } else {
    land()
  }
}

function onUndo() {
  if (busy || !undoStack.length) return
  Voice.wake(300)
  applyState(JSON.parse(undoStack.pop()))
  saveState()
  hideWinner()
  clearPins()
  renderBoard({ all: "morph" })
  sounds.pin(1, false)
}

// ---------------------------------------------------------------------------
// La fin

let fireworks = null

function showWinner(celebrate) {
  const teamId = winnerTeamId()
  const led = winnerLed
  const team = teamId === null ? null : teamState(teamId)
  const color = team ? colorOf(teamId) : "#ff4040"
  $("winner").style.setProperty("--c", color)
  $("winnerNames").textContent = team
    ? team.members.map((p) => p.name).join("\u00a0· ")
    : ""
  $("winnerText").textContent = !team
    ? "Personne n'a gagné !"
    : team.members.length > 1
      ? "ont gagné !"
      : "a gagné !"
  $("winnerUndoBtn").classList.toggle("hidden", undoStack.length === 0)
  $("winner").classList.remove("hidden")
  led.setColor(color)
  led.resize()
  led.set(team ? team.score : -1)
  led.setPulse(true)

  if (celebrate) {
    sounds.win()
    if (!reducedMotion) {
      let n = 0
      const pop = () => {
        const r = $("winnerLed").getBoundingClientRect()
        sparks.burst(
          r.left + Math.random() * r.width,
          r.top + Math.random() * r.height * 0.6,
          n % 2 ? "#ffffff" : color,
        )
        if (++n < 7) fireworks = setTimeout(pop, 260)
      }
      pop()
    }
  }
}

function hideWinner() {
  clearTimeout(fireworks)
  winnerLed.setPulse(false)
  $("winner").classList.add("hidden")
}

// ---------------------------------------------------------------------------
// Les écrans

// anim : au coup d'envoi, les zéros s'allument ligne après ligne.
function showScreen(anim) {
  $("setup").classList.toggle("hidden", gameStarted)
  $("game").classList.toggle("hidden", !gameStarted)
  if (gameStarted) {
    buildBoard()
    clearPins()
    renderBoard(anim)
  } else {
    chosenTeamId = getNextAvailableTeamId()
    renderSetup()
  }
}

function openOverlay(id) {
  $(id).classList.remove("hidden")
}
function closeOverlay(id) {
  $(id).classList.add("hidden")
}

let winnerLed

document.addEventListener("DOMContentLoaded", function () {
  sparks.init()
  winnerLed = new Led($("winnerLed"), "#ff4040")
  buildPins()
  updateSoundBtn()

  try {
    loadState()
    showScreen()
  } catch (e) {
    // État illisible, ou écrit par une version antérieure dont la forme a
    // changé depuis (un joueur sans `history`, par exemple) : on repart d'une
    // partie vierge. Sinon la page reste cassée au chargement, sans autre
    // issue que vider les données du site.
    console.warn("État Mölkky illisible, on repart d'une partie vierge :", e)
    localStorage.removeItem("molkkyState")
    applyState({})
    showScreen()
  }
  if (gameEnded) showWinner(false)

  $("addForm").addEventListener("submit", onAddPlayer)
  $("startBtn").addEventListener("click", () => {
    Voice.wake(800)
    startGame()
    if (!gameStarted) return
    sounds.win()
    showScreen({ all: "fall" })
  })
  $("throwBtn").addEventListener("click", onThrow)
  $("undoBtn").addEventListener("click", onUndo)
  $("winnerUndoBtn").addEventListener("click", onUndo)
  const restart = () => {
    hideWinner()
    newGame()
    showScreen()
  }
  $("rematchBtn").addEventListener("click", restart)
  $("newGameBtn").addEventListener("click", () => {
    if (!gameStarted) return
    openOverlay("confirm")
  })
  $("confirmNo").addEventListener("click", () => closeOverlay("confirm"))
  $("confirmYes").addEventListener("click", () => {
    closeOverlay("confirm")
    restart()
  })
  $("rulesBtn").addEventListener("click", () => openOverlay("rules"))
  $("rulesClose").addEventListener("click", () => closeOverlay("rules"))
  $("soundBtn").addEventListener("click", () => {
    soundOn = !soundOn
    localStorage.setItem("molkkySon", soundOn ? "on" : "off")
    updateSoundBtn()
    Voice.wake(300)
    sounds.pin(5, true)
  })
  // Un tap à côté du panneau le ferme, sauf la victoire.
  ;["confirm", "rules"].forEach((id) =>
    $(id).addEventListener("click", (e) => {
      if (e.target.id === id) closeOverlay(id)
    }),
  )

  let resizeTimer
  addEventListener("resize", () => {
    clearTimeout(resizeTimer)
    resizeTimer = setTimeout(() => {
      sparks.resize()
      sizeLeds()
      if (!$("winner").classList.contains("hidden")) winnerLed.resize()
    }, 100)
  })
})
