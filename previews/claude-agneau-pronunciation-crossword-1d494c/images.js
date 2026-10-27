// Les images des mots : un WebP par mot dans images/mots/, dessiné par
// outils/images.py. Elles remplacent les emojis, qui changent d'un téléphone à
// l'autre et n'existent pas pour tous les mots.
//
//   WordImage.src(word)       // l'adresse de l'image, pour un <img>
//   WordImage.preload(words)  // au chargement du jeu : toutes passent par le
//                             // service worker, et le jeu marche hors-ligne
window.WordImage = {
  // Même règle que slug() dans outils/voix.py et que voix.js, recopiée : un
  // voix.js d'avant, encore servi par le cache du service worker, ne
  // l'exposerait pas.
  src: (word) =>
    "images/mots/" +
    word.normalize("NFD").replace(/\p{M}/gu, "").replace(/ /g, "-") +
    ".webp",

  preload(words) {
    for (const word of words) new Image().src = this.src(word)
  },
}
