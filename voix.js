// La voix des jeux : des mots pré-enregistrés par outils/voix.py, un MP3 par
// mot dans audio/<jeu>/, nommé sans accents ni espaces.
//
// Ils sont joués par un seul contexte Web Audio, débloqué par les gestes de
// l'enfant : il peut alors parler plus tard (après une animation), ce qu'un
// <audio> refuse sur iPhone. Il se rendort une fois le son joué, pour ne pas
// garder l'audio du téléphone allumé. La synthèse du navigateur sert en
// secours si un fichier manque.
//
//   Voice.folder = "audio/p-ou-q/"  // une fois, au chargement du jeu
//   Voice.wake(300)                 // dans un geste de l'enfant : débloque l'audio
//   Voice.load(word)                // à l'affichage du mot, pour qu'il soit prêt
//   await Voice.say(word)           // tenue quand le mot est dit
//   Voice.context()                 // pour jouer d'autres sons
window.Voice = (function () {
  let ctx = null
  let sleepTimer = null
  let sleepAt = 0
  const files = new Map()

  function context() {
    const Ctx = window.AudioContext || window.webkitAudioContext
    if (Ctx && !ctx) ctx = new Ctx()
    return ctx
  }

  // Réveille l'audio pour au moins `ms` : un son bref n'écourte pas un
  // réveil plus long déjà prévu.
  function wake(ms) {
    const c = context()
    if (!c) return null
    c.resume()
    if (Date.now() + ms > sleepAt) {
      sleepAt = Date.now() + ms
      clearTimeout(sleepTimer)
      sleepTimer = setTimeout(() => c.suspend(), ms)
    }
    return c
  }

  // Même règle que slug() dans outils/voix.py.
  const fileFor = (word) =>
    Voice.folder +
    word.normalize("NFD").replace(/\p{M}/gu, "").replace(/ /g, "-") +
    ".mp3"

  // Le MP3 est chargé d'avance (quelques Ko), et décodé seulement s'il faut
  // le dire.
  function load(word) {
    if (!files.has(word)) {
      files.set(
        word,
        fetch(fileFor(word))
          .then((r) => (r.ok ? r.arrayBuffer() : null))
          .catch(() => null),
      )
    }
    return files.get(word)
  }

  async function say(word) {
    const data = await load(word)
    const c = context()
    // slice : le décodage vide le tampon, et le mot peut revenir.
    const buffer =
      data && c && (await c.decodeAudioData(data.slice(0)).catch(() => null))
    if (!buffer) return speakWithBrowser(word)
    wake(buffer.duration * 1000 + 500)
    const source = c.createBufferSource()
    source.buffer = buffer
    source.connect(c.destination)
    return new Promise((resolve) => {
      source.onended = resolve
      source.start()
    })
  }

  function speakWithBrowser(word) {
    if (!window.speechSynthesis) return Promise.resolve()
    const utterance = new SpeechSynthesisUtterance(word)
    utterance.lang = "fr-FR"
    utterance.voice = window.speechSynthesis
      .getVoices()
      .find((voice) => voice.lang == "fr-FR" && voice.name == "Thomas")
    return new Promise((resolve) => {
      utterance.onend = utterance.onerror = resolve
      setTimeout(resolve, 3000)
      window.speechSynthesis.speak(utterance)
    })
  }

  const Voice = { folder: "audio/", context, wake, load, say }
  return Voice
})()
