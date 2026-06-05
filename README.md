# Marzouzoute — boîte à jeux

PWA (Progressive Web App) regroupant une collection de petits jeux éducatifs en
français : lecture, orthographe, phonétique, logique et jeux de société
(Sutom, Pendu, Démineur, Othello, Puissance 4, Dames, 2048, Memory…).

Le projet est en **HTML/CSS/JS statique, sans étape de build** : chaque jeu est
une page autonome, reliée depuis [`index.html`](index.html).

## PWA

- [`manifest.json`](manifest.json) — métadonnées d'installation (nom, icônes,
  couleurs, `start_url`, `scope`).
- [`service-worker.js`](service-worker.js) — cache hors-ligne : précache de la
  coquille de l'app à l'installation, puis _network-first_ pour les pages et
  _stale-while-revalidate_ pour les autres ressources. Le `CACHE_VERSION` purge
  les anciens caches : pense à l'incrémenter quand un asset précaché change.

L'app est installable depuis le navigateur (« Ajouter à l'écran d'accueil ») et
reste utilisable hors-ligne une fois les pages visitées.

## Déploiement — GitHub Pages

Le site est publié sur GitHub Pages : <https://isc.github.io/reading-practice/>

- **`.github/workflows/deploy.yml`** — à chaque push sur `main`, publie le dépôt
  à la racine de la branche `gh-pages` (via `peaceiris/actions-gh-pages`).
- **`.github/workflows/preview.yml`** — à chaque PR, déploie une preview isolée
  sous `previews/<branche>/` et commente la PR avec le lien.
- **`.github/workflows/preview-cleanup.yml`** — supprime la preview à la
  fermeture de la PR.

Comme tous les chemins de l'app sont relatifs, aucune réécriture n'est
nécessaire pour servir l'app sous un sous-dossier de preview.

### Activation (à faire une fois)

Dans **Settings → Pages** du dépôt, choisir comme source la branche **`gh-pages`**
(dossier `/ (root)`). La branche est créée automatiquement au premier déploiement
sur `main`.
