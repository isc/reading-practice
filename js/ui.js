// Les couleurs que prend chaque mot une fois lu : la phrase finie est un
// ruban d'arc-en-ciel.
const COLORS = [
  ["#ff5d8f", "#ff7a6b"],
  ["#ff7a45", "#ffa230"],
  ["#e8a10c", "#f5c02a"],
  ["#22b07d", "#4fd1a1"],
  ["#1e9bf0", "#4fb8ff"],
  ["#6b6bff", "#8f8cff"],
  ["#b05cff", "#d27bff"],
]

const LEVELS = {
  easy: { name: "Facile", color: "#22b07d", bars: 1 },
  medium: { name: "Moyen", color: "#f08a24", bars: 2 },
  hard: { name: "Difficile", color: "#e8457c", bars: 3 },
}

const $ = (id) => document.getElementById(id)
const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)")
const reduceMotion = () => motionQuery.matches

function paint(el, index) {
  const [c, c2] = COLORS[index % COLORS.length]
  el.style.setProperty("--c", c)
  el.style.setProperty("--c2", c2)
}

function wordSpan(text, index) {
  const span = document.createElement("span")
  span.className = "word"
  span.textContent = text
  span.dataset.index = index
  paint(span, index)
  return span
}

function card(className = "") {
  const div = document.createElement("div")
  div.className = "card " + className
  $("stage").replaceChildren(div)
  return div
}

function levelBadge(level) {
  const { name, color, bars } = LEVELS[level]
  const badge = document.createElement("div")
  badge.className = "level"
  badge.style.setProperty("--lc", color)
  badge.innerHTML =
    `<svg viewBox="0 0 22 16" fill="currentColor">` +
    [0, 1, 2]
      .map(
        (i) =>
          `<rect x="${i * 8}" y="${10 - i * 5}" width="6" height="${6 + i * 5}" rx="2" opacity="${i < bars ? 1 : 0.25}"/>`,
      )
      .join("") +
    `</svg>${name}`
  return badge
}

export function showHome(bestTime) {
  const home = card("home")
  home.innerHTML = `<h1 class="title">Lis à voix haute</h1>
    <p class="subtitle">Chaque mot lu s'allume.</p>`
  const demo = document.createElement("div")
  demo.className = "sentence demo"
  "Je lis tout haut".split(" ").forEach((text, i) => {
    const span = wordSpan(text, i * 2)
    span.style.setProperty("--i", i)
    demo.append(span)
  })
  home.append(demo)
  $("timer").hidden = true
  $("steps").hidden = true
  showBest(bestTime)
}

export function buildSteps(levels) {
  $("steps").replaceChildren(
    ...levels.map(([level, count]) => {
      const group = document.createElement("span")
      group.style.setProperty("--c", LEVELS[level].color)
      for (let i = 0; i < count; i++) group.append(document.createElement("i"))
      return group
    }),
  )
}

export function updateSteps(current) {
  $("steps")
    .querySelectorAll("i")
    .forEach((dot, i) => {
      dot.classList.toggle("done", i < current)
      dot.classList.toggle("now", i === current)
    })
  $("steps").hidden = false
}

export function displaySentence(sentence, level) {
  const box = card(level)
  box.append(levelBadge(level))
  const line = document.createElement("div")
  line.className = "sentence"
  line.id = "sentence"
  sentence.text.split(" ").forEach((text, i) => line.append(wordSpan(text, i)))
  const emoji = document.createElement("div")
  emoji.className = "emoji"
  emoji.id = "emoji"
  box.append(line, emoji)
  line.firstChild.classList.add("next")
  $("timer").hidden = false
}

export function markWordAsCorrect(index) {
  const word = document.querySelector(`.word[data-index="${index}"]`)
  if (!word) return
  word.classList.remove("next")
  word.classList.add("lit")
  word.nextElementSibling?.classList.add("next")
  if (reduceMotion()) return
  word.animate(
    [
      { transform: "scale(1)" },
      { transform: "scale(1.14)", offset: 0.4 },
      { transform: "scale(1)" },
    ],
    { duration: 420, easing: "ease-out" },
  )
  burst(word)
}

// Un anneau qui s'élargit et quelques étincelles autour du mot allumé
function burst(word) {
  const ring = document.createElement("span")
  ring.className = "ring"
  word.append(ring)
  ring
    .animate(
      [
        { transform: "scale(1)", opacity: 0.9 },
        { transform: "scale(1.35, 1.6)", opacity: 0 },
      ],
      { duration: 600, easing: "ease-out" },
    )
    .finished.then(() => ring.remove())
  for (let i = 0; i < 7; i++) {
    const spark = document.createElement("span")
    spark.className = "spark"
    word.append(spark)
    const angle = (i / 7) * Math.PI * 2 + Math.random() * 0.6
    const dist = 34 + Math.random() * 26
    spark
      .animate(
        [
          { transform: "translate(0, 0) scale(1)", opacity: 1 },
          {
            transform: `translate(${Math.cos(angle) * dist}px, ${Math.sin(angle) * dist * 0.7}px) scale(0.2)`,
            opacity: 0,
          },
        ],
        {
          duration: 550 + Math.random() * 200,
          easing: "cubic-bezier(.2,.7,.3,1)",
        },
      )
      .finished.then(() => spark.remove())
  }
}

// La phrase est lue : les mots font la vague, l'image éclot dessous.
export function showSentenceComplete(emoji) {
  const box = $("emoji")
  box.innerHTML = `<i class="halo"></i><span>${emoji}</span>`
  if (reduceMotion()) return
  document
    .querySelectorAll("#sentence .word")
    .forEach((word, i) =>
      word.animate(
        [
          { transform: "translateY(0)" },
          { transform: "translateY(-10px)", offset: 0.35 },
          { transform: "translateY(0)" },
        ],
        { duration: 520, delay: 200 + i * 60, easing: "ease-in-out" },
      ),
    )
  box.lastChild.animate(
    [
      { transform: "scale(0) rotate(-25deg)", opacity: 0 },
      { transform: "scale(1.2) rotate(6deg)", opacity: 1, offset: 0.65 },
      { transform: "scale(1) rotate(0)", opacity: 1 },
    ],
    { duration: 650, easing: "ease-out", fill: "backwards" },
  )
  box.firstChild.animate(
    [
      { transform: "scale(0.2)", opacity: 0 },
      { transform: "scale(1.15)", opacity: 1, offset: 0.6 },
      { transform: "scale(1)", opacity: 1 },
    ],
    { duration: 900, easing: "ease-out" },
  )
}

export function showGameEnd(time, bestTime, isBestTime, emojis) {
  const end = card("end")
  const gallery = document.createElement("div")
  gallery.className = "gallery"
  emojis.forEach((emoji, i) => {
    const tile = document.createElement("span")
    tile.textContent = emoji
    paint(tile, i)
    gallery.append(tile)
    if (!reduceMotion())
      tile.animate(
        [
          { transform: "scale(0)", opacity: 0 },
          { transform: "scale(1.15)", opacity: 1, offset: 0.7 },
          { transform: "scale(1)", opacity: 1 },
        ],
        { duration: 420, delay: i * 90, easing: "ease-out", fill: "backwards" },
      )
  })
  const trophy = $("record").querySelector("svg").outerHTML
  end.append(gallery)
  end.insertAdjacentHTML(
    "beforeend",
    `<div class="total">${time}<small>s</small></div>
    <div class="verdict">${trophy}${isBestTime ? "Nouveau record !" : `Record : ${bestTime} s`}</div>`,
  )
  $("timer").hidden = true
  $("steps").hidden = true
  showBest(bestTime)
}

export function updateTimerDisplay(time) {
  $("time").textContent = `${time} s`
}

export function showBest(bestTime) {
  $("record").hidden = !isFinite(bestTime)
  $("best").textContent = `${bestTime} s`
}

// Le gros bouton change de rôle au fil de la partie :
// start (micro), listen (micro qui écoute), idle (micro au repos, à
// toucher pour relancer l'écoute), denied (micro barré), next, replay.
const MODES = {
  start: ["Commencer", "Touche le micro"],
  listen: ["J'écoute", "Lis la phrase"],
  idle: ["Relancer le micro", "Touche le micro"],
  denied: ["Micro indisponible", "Il faut le micro"],
  next: ["Phrase suivante", ""],
  replay: ["Rejouer", ""],
}

export function setMode(mode) {
  const go = $("go")
  go.dataset.mode = mode
  const [label, hint] = MODES[mode]
  go.setAttribute("aria-label", label)
  $("hint").textContent = hint
}

export const mode = () => $("go").dataset.mode

// Le navigateur a entendu quelque chose : le micro bat une fois.
let heartbeat
export function heard() {
  if (reduceMotion() || heartbeat?.playState === "running") return
  heartbeat = $("go").animate(
    [
      { transform: "scale(1)" },
      { transform: "scale(1.08)" },
      { transform: "scale(1)" },
    ],
    { duration: 260, easing: "ease-out" },
  )
}

export function refuse() {
  $("go").animate(
    [
      { transform: "translateX(0)" },
      { transform: "translateX(-8px)" },
      { transform: "translateX(8px)" },
      { transform: "translateX(-5px)" },
      { transform: "translateX(0)" },
    ],
    { duration: 380 },
  )
}

export function onGo(callback) {
  $("go").addEventListener("click", callback)
  document.addEventListener("keydown", (event) => {
    if (event.code !== "Space" && event.code !== "Enter") return
    if (event.target.closest("button")) return // le bouton se clique tout seul
    event.preventDefault()
    $("go").click()
  })
}
