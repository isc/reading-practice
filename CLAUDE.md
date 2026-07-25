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
- **Listes de mots** : `fetch('fr_FR.txt')` (gros dictionnaire français) ou
  `fetch('mots-enfants.txt')` (mots adaptés aux enfants).

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
