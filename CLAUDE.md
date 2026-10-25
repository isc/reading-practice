# CLAUDE.md — conventions du projet

**Marzouzoute** est une **boîte à jeux éducatifs en français** pour enfants,
livrée comme **PWA statique, sans étape de build**. Chaque jeu est une page HTML
autonome, reliée depuis la grille de `index.html`.

Ce fichier décrit les conventions à respecter **impérativement** quand tu ajoutes
ou modifies un jeu, pour que tout reste cohérent et fonctionne en production
(GitHub Pages) comme dans les previews de PR.

## Architecture

- **Un jeu = un fichier HTML autonome** à la racine du dépôt
  (ex. `fracto-dingo.html`). Tout le CSS et le JS du jeu vivent **en ligne**
  dans ce fichier (`<style>` et `<script>`), comme les jeux existants
  (`sutom.html`, `b-ou-d.html`, `2048.html`…).
- **Pas de framework, pas de bundler, pas de CDN, pas de dépendance externe.**
  Le HTML/CSS/JS natif suffit. Le site doit fonctionner **hors-ligne**.
- **Chemins relatifs uniquement.** Jamais de chemin commençant par `/`.
  C'est critique : le site est servi sous un sous-dossier
  (`/reading-practice/`, et `/reading-practice/previews/<branche>/` pour les
  previews). Un chemin absolu casse tout.

## Squelette d'un nouveau jeu

```html
<!doctype html>
<html lang="fr">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="theme-color" content="#f0f2f5" />
    <title>Nom du jeu</title>
    <style>
      /* styles du jeu */
    </style>
  </head>
  <body>
    <!-- interface du jeu -->
    <script>
      // logique du jeu
    </script>
  </body>
</html>
```

## Style & UX

- **Barre d'état** : le `theme-color` de chaque page prend la couleur du haut
  de son fond. Chrome sur Android colore la barre d'état avec, même dans la
  PWA installée ; sinon elle garde la couleur du manifeste et jure avec le jeu.
- **Barre du bas** (navigation Android) : elle, ne suit pas les pages. Chrome
  la peint d'une seule couleur pour toute l'appli installée, celle du
  manifeste (`background_color`, et `theme_color` à l'identique, comme l'a
  établi kine-tracker). Elle est noire : sous un jeu sombre elle se fond, sous
  un jeu clair elle passe pour la barre normale d'Android, alors qu'une bande
  claire sous un jeu sombre fait bug. Une appli installée relit son manifeste
  au plus une fois par jour : réinstaller pour voir un changement tout de suite.
- **Pas de sélection de texte** : un appui long ne doit rien sélectionner ni
  ouvrir de bulle. Le `body` prend `-webkit-user-select: none` et
  `user-select: none` (Safari veut le préfixe), plus
  `-webkit-touch-callout: none` s'il y a des images ou des liens. Les champs
  de saisie restent sélectionnables, sans quoi l'iPad peut refuser la
  saisie : `input, textarea { -webkit-user-select: text; user-select: text }`.
- **Animations continues** : une animation infinie n'anime que `transform` ou
  `opacity` (une lueur qui bat : un `::after` dont l'opacité varie), et jamais
  de `filter: blur` sur un grand calque. Le reste se repeint à chaque image :
  sur un vieil iPad, le sudoku devenait injouable au fil de la partie
  (octobre 2026).
- **Hauteur d'écran** : jamais `100vh` ni `100dvh` pour la hauteur de la page.
  Dans l'appli installée sur Android, Chrome y compte la barre d'état, que la
  page n'occupe pas. La page dépassait donc de ~58 px : elle défilait, et son
  bas passait sous la barre du bas (vécu sur b ou d en octobre 2026, mesuré
  sur les captures du Pixel). Une page à fond uni n'a besoin de rien : le
  fond du `body` couvre de toute façon l'écran. Quand la page doit remplir
  l'écran (fond en dégradé, conteneur plein écran), la hauteur vient des
  pourcentages, qui suivent la zone vraiment visible :

  ```css
  html {
    min-height: 100%;
    display: flex;
    flex-direction: column;
  }
  body {
    flex-grow: 1;
  }
  ```

  Pour un conteneur plein écran, `body` passe en colonne
  (`display: flex; flex-direction: column`) et le conteneur prend `flex: 1`
  (avec `width: 100%` s'il est centré par `margin: 0 auto`). Si `body` est en
  ligne, le conteneur prend `align-self: stretch` (tetris). `html` grandit
  avec le contenu, donc un fond en dégradé couvre toute la page. Un écran de
  hauteur fixe, qui ne défile jamais, enchaîne `height: 100%` sur `html`,
  `body` et le conteneur (memory). `svh` n'aide pas : l'appli installée n'a
  pas de barre de navigateur, donc `svh` y vaut `dvh`. Une taille de plateau
  tirée de la hauteur se calcule plutôt sur la place qu'a pris le conteneur
  (`clientHeight` en JS, comme tetris).

- **Langue** : toute l'interface est en **français**.
- **Couleurs** : accent principal `#4a90e2` (bleu), fond de page `#f0f2f5`.
- **Mobile-first** : conçu d'abord pour le tactile. Grandes cibles tactiles,
  pas de dépendance au survol. Restreins les effets de survol avec
  `@media (hover: hover) { … }` (sinon ils « collent » sur tactile).
- **Police** : `Arial` convient ; pour les jeux de **lecture / orthographe**,
  privilégie la police adaptée dyslexie déjà présente :
  ```css
  @font-face {
    font-family: "OpenDyslexicRegular";
    src: url("OpenDyslexic-Regular.woff2") format("woff2");
  }
  ```
- Public : enfants. Vocabulaire simple, retours visuels clairs, ton bienveillant.

## Ressources partagées réutilisables (toutes en chemin relatif)

- **Confettis de victoire** : ajoute `<canvas id="confetti"></canvas>` (en
  position fixe, plein écran, `pointer-events: none`), inclus
  `<script src="confetti.js"></script>` et appelle `showConfetti()` à la victoire.
- **Garde anti-sortie** : `<script src="exit-guard.js"></script>` (dans le
  `<head>`, pour être disponible dès l'exécution du script du jeu) demande
  confirmation avant de quitter une partie en cours (utile pour le geste
  « retour » sur mobile). À défaut d'indication, le garde s'arme à la première
  interaction avec la page — trop grossier : **chaque jeu doit délimiter ses
  parties explicitement** avec `if (window.ExitGuard) ExitGuard.setActive(…)` :
  - `true` quand la partie est réellement engagée (premier coup joué, première
    réponse saisie…), pas au simple affichage du plateau ;
  - `false` au chargement / sur les écrans d'accueil, de choix de niveau et de
    fin de partie, ainsi qu'à chaque nouvelle partie.

  Sans ça, on demande « Une partie est en cours ? » sur l'écran des scores ou
  après la victoire, et les enfants finissent par répondre au hasard.

- **Listes de mots** : `fetch('dictionnaire.txt')` (les mots du français
  qu'accepterait un joueur de Scrabble) ou `fetch('mots-enfants.txt')` (mots
  adaptés aux enfants). `dictionnaire.txt` donne une forme par ligne, en
  minuscules avec ses accents, sans tiret ni apostrophe, après trois lignes
  de licence qui commencent par `#` : un jeu les ignore. Il se fabrique avec
  `outils/dictionnaire.py`, depuis le lexique libre de Grammalecte : jamais
  à la main. Un jeu qui montre de lui-même un mot tiré
  du dictionnaire écarte les gros mots (cf. `SWEAR_WORD` dans le mot le plus
  long) ; le joueur, lui, peut taper n'importe quel mot qui existe.

## Brancher le jeu dans l'accueil

Ajoute une carte dans la grille de `index.html` :

```html
<a class="grid-option" href="fracto-dingo.html">
  <h3>Fracto Dingo</h3>
</a>
```

## PWA / cache

- Les nouvelles pages de jeu sont mises en cache **automatiquement** par le
  service worker à la première visite (aucune modif de `service-worker.js`
  nécessaire).
- N'incrémente `CACHE_VERSION` dans `service-worker.js` **que** si tu modifies un
  asset déjà précaché (la coquille) et veux forcer une purge immédiate.

## Style de code

- Prettier est configuré (`.prettierrc` : `tabWidth: 2`, pas de point-virgule).
  Reste cohérent avec le fichier que tu édites.

## Déploiement (pour info)

- Push sur `main` → publication sur GitHub Pages.
- Chaque PR → preview isolée déployée automatiquement, avec lien posté en
  commentaire. C'est cette preview qui sert à tester un nouveau jeu avant merge.
- **Tout workflow qui écrit sur `gh-pages` rejoint le groupe de concurrence
  `gh-pages` avec `queue: max`** (donc `cancel-in-progress: false`). Sans la
  file, GitHub ne garde qu'un run en attente par groupe et annule l'autre en
  silence : au merge d'une PR, déploiement et suppression de la preview
  arrivent ensemble, et le déploiement pouvait disparaître. La file ne garantit
  l'ordre qu'au mieux : le déploiement publie donc la tête de main du moment,
  et n'est vert qu'une fois le site en train de la servir (`/.deploy-sha`).
