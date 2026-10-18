// Garde l'écran allumé tant que la page est affichée.
//
// Certaines pages restent à l'écran de longues minutes sans qu'on y touche
// (feuille de score entre deux tours, sablier d'un jeu de parole…) : le
// téléphone se met en veille en plein milieu. Il suffit d'inclure ce script
// pour l'empêcher, il n'y a rien à appeler.
//
// Le verrou est relâché d'office par le navigateur dès que l'onglet passe en
// arrière-plan : on le redemande au retour, et à n'importe quel tap au cas où
// le navigateur exigerait un geste de l'utilisateur.
;(function () {
  if (!("wakeLock" in navigator)) return
  var lock = null

  async function keepAwake() {
    if (lock) return
    try {
      lock = await navigator.wakeLock.request("screen")
      lock.addEventListener("release", function () {
        lock = null
      })
    } catch (e) {
      // refusé (batterie faible, onglet masqué…) : on retentera au tap suivant
    }
  }

  document.addEventListener("visibilitychange", keepAwake)
  document.addEventListener("pointerdown", keepAwake, { passive: true })
  keepAwake()
})()
