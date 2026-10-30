// Les explications des mots : ce qu'est un mot (« le verbe creuser, au
// présent, avec « ils » ou « elles » ») et, s'il est peu courant, sa
// définition pour enfants. Elles viennent de explications/*.json, fabriqués
// par outils/explications.py : un fichier par première lettre pour le
// dictionnaire (mots de 3 à 9 lettres), et un bien plus petit,
// explications/enfants.json, pour les mots de mots-enfants.txt.
//
//   Explications.preload(word)                  // pendant la manche
//   Explications.show(el, word)                 // un mot du dictionnaire
//   Explications.show(el, word, { kid: true })  // un mot de mots-enfants.txt
//
// show() vide el, puis y met deux paragraphes au plus, que le jeu habille :
//   <p><b>creusent</b> : le verbe creuser, au présent, ….</p>
//   <p class="definition">« creuser » : ….<small> (d'après le Wiktionnaire)</small></p>
// Rien n'apparaît si le mot est inconnu, ou hors ligne, ni pour un gros mot
// si la page charge gros-mots.js. Un mot vide efface l'explication en cours
// de chargement.
window.Explications = (function () {
  const files = new Map()

  // Une lettre pèse jusqu'à 6 Mo une fois lue : on garde les deux dernières
  // servies.
  function load(name) {
    let data = files.get(name)
    if (data) files.delete(name)
    else {
      if (files.size >= 2) files.delete(files.keys().next().value)
      data = fetch(`explications/${name}.json`)
        .then((res) => (res.ok ? res.json() : Promise.reject()))
        .catch(() => {
          files.delete(name) // hors ligne : on réessaiera
          return null
        })
    }
    files.set(name, data)
    return data
  }

  // Comme les clés des fichiers : sans accents, en majuscules, Œ et Æ dédoublés.
  function key(word) {
    return word
      .normalize("NFD")
      .replace(/\p{M}/gu, "")
      .toUpperCase()
      .replace(/Œ/g, "OE")
      .replace(/Æ/g, "AE")
  }

  const fileOf = (mot, kid) => (kid ? "enfants" : mot[0])

  function preload(word, { kid = false } = {}) {
    if (word) load(fileOf(key(word), kid))
  }

  async function show(el, word, { kid = false } = {}) {
    el.replaceChildren()
    const mot = key(word || "")
    el.dataset.word = mot
    if (!mot || (window.SWEAR_WORD && SWEAR_WORD.test(mot))) return
    const data = await load(fileOf(mot, kid))
    const entry = data && data.mots[mot]
    // Un autre mot a pu être demandé pendant le chargement.
    if (!entry || el.dataset.word !== mot) return
    const [form, what, lemma] = entry
    const line = document.createElement("p")
    const bold = document.createElement("b")
    bold.textContent = form
    line.append(bold, ` : ${what}.`)
    el.append(line)
    if (lemma) {
      const definition = document.createElement("p")
      definition.className = "definition"
      const credit = document.createElement("small")
      credit.textContent = " (d'après le Wiktionnaire)"
      definition.append(`« ${lemma} » : ${data.definitions[lemma]}.`, credit)
      el.append(definition)
    }
  }

  return { preload, show }
})()
