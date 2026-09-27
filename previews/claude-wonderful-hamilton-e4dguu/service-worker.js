// Service worker de la boîte à jeux « Marzouzoute ».
//
// Stratégie volontairement simple, sans étape de build :
//   - on précache la coquille de l'app (index + assets partagés) à l'install ;
//   - en navigation (pages HTML), on tente le réseau puis on retombe sur le
//     cache pour rester utilisable hors-ligne ;
//   - pour les autres ressources même-origine, on sert le cache en priorité et
//     on rafraîchit en arrière-plan (stale-while-revalidate).
//
// Numéro de version du cache. Pas besoin de le changer à chaque déploiement :
// les pages HTML sont servies réseau-d'abord et les autres assets en
// stale-while-revalidate, donc tout se met à jour seul (au pire au rechargement
// suivant). Incrémente-le seulement pour forcer une purge immédiate — correctif
// critique, ou fichiers supprimés/renommés à évacuer du cache.
const CACHE_VERSION = "v1"
const CACHE_NAME = `marzouzoute-${CACHE_VERSION}`

// Coquille minimale précachée. Les pages de jeux et les gros dictionnaires
// (fr_FR.txt, mots-enfants.txt) sont mis en cache à la volée plutôt qu'ici,
// pour ne pas plomber la première installation.
const PRECACHE_URLS = [
  "./",
  "./index.html",
  "./manifest.json",
  "./style.css",
  "./confetti.js",
  "./exit-guard.js",
  "./wake-lock.js",
  "./OpenDyslexic-Regular.woff2",
  "./icon-192x192.png",
  "./icon-512x512.png",
]

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      // addAll échoue en bloc si une seule URL renvoie une erreur ; on tolère
      // les manquants pour ne pas casser toute l'installation.
      .then((cache) =>
        Promise.allSettled(PRECACHE_URLS.map((url) => cache.add(url))),
      )
      .then(() => self.skipWaiting()),
  )
})

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter(
              (key) => key.startsWith("marzouzoute-") && key !== CACHE_NAME,
            )
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  )
})

self.addEventListener("fetch", (event) => {
  const { request } = event

  // On ne gère que les GET même-origine ; le reste passe au réseau directement.
  if (request.method !== "GET") return
  const url = new URL(request.url)
  if (url.origin !== self.location.origin) return

  // Navigation (pages HTML) : réseau d'abord, cache en secours hors-ligne.
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone()
          caches.open(CACHE_NAME).then((cache) => cache.put(request, copy))
          return response
        })
        .catch(() =>
          caches
            .match(request)
            .then((cached) => cached || caches.match("./index.html")),
        ),
    )
    return
  }

  // Autres ressources : stale-while-revalidate.
  event.respondWith(
    caches.match(request).then((cached) => {
      const network = fetch(request)
        .then((response) => {
          if (response && response.ok) {
            const copy = response.clone()
            caches.open(CACHE_NAME).then((cache) => cache.put(request, copy))
          }
          return response
        })
        .catch(() => cached)
      return cached || network
    }),
  )
})
