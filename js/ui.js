export function displaySentence(sentence) {
  const sentenceDiv = document.getElementById("sentence")
  const emojiDiv = document.getElementById("emoji")
  sentenceDiv.innerHTML = ""
  emojiDiv.innerHTML = ""
  document.getElementById("next").style.display = "none"

  sentence.text.split(" ").forEach((word, index) => {
    const span = document.createElement("span")
    span.textContent = word
    span.className = "word"
    span.setAttribute("data-index", index)
    if (index > 0) sentenceDiv.appendChild(document.createTextNode(" "))
    sentenceDiv.appendChild(span)
  })
}

export function markWordAsCorrect(index) {
  const wordElement = document.querySelector(`.word[data-index="${index}"]`)
  if (wordElement) wordElement.classList.add("correct")
}

export function showEmoji(emoji) {
  const emojiDiv = document.getElementById("emoji")
  emojiDiv.innerHTML = `<span class="large-emoji">${emoji}</span>`
}

export function updateTimerDisplay(time) {
  document.getElementById("timer").textContent = `Temps: ${time}s`
}

export function updateLevelDisplay(level) {
  document.getElementById("level").textContent = `Niveau: ${
    level.charAt(0).toUpperCase() + level.slice(1)
  }`
}

export function showGameEndMessage(time, bestTime, isBestTime) {
  const message = isBestTime
    ? `Félicitations! Nouveau record: ${time}s!`
    : `Temps: ${time}s (Record: ${bestTime}s)`
  document.getElementById("timer").textContent = message
}

export function setButtonVisibility(buttonId, visible) {
  document.getElementById(buttonId).style.display = visible ? "block" : "none"
}

export function onClick(id, callback) {
  document.getElementById(id).addEventListener("click", callback)
}

export function setupKeyboardControls(onNext, onStart) {
  document.addEventListener("keydown", (event) => {
    if (event.code !== "Space" && event.code !== "Enter") return
    const nextButton = document.getElementById("next")
    const startButton = document.getElementById("start")
    
    if (nextButton.style.display !== "none") {
      event.preventDefault()
      onNext()
    } else if (startButton.style.display !== "none") {
      event.preventDefault()
      onStart()
    }
  })
}
