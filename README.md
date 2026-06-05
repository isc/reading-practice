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

## Contribuer un jeu via une issue (Claude)

Une contributrice autorisée peut faire ajouter un jeu **sans écrire de code** :

1. Elle ouvre une **issue** avec le template _« 🎮 Nouveau jeu »_ décrivant le jeu.
2. Le workflow **`claude-issue-to-pr.yml`** déclenche Claude (modèle Opus), qui
   implémente le jeu en suivant [`CLAUDE.md`](CLAUDE.md), ouvre une **PR** et
   poste le lien de la PR dans l'issue.
3. La **preview** de la PR se déploie (workflow `preview.yml`) → elle teste le jeu
   en live.
4. Elle laisse des retours en commentant **`@claude …`** sur la PR ; le workflow
   **`claude.yml`** relance Claude, qui ajuste et repush (la preview se met à jour).
5. Le mainteneur relit et merge.

### Mise en place (admin, une fois)

1. **Installer l'app GitHub Claude** sur le dépôt :
   <https://github.com/apps/claude> (permissions Contents / Issues / Pull requests).
   _Astuce : la commande `/install-github-app` dans Claude Code fait l'app + le
   secret d'un coup._ Installer l'app (et non se reposer sur le `GITHUB_TOKEN` par
   défaut) est nécessaire pour que les PR créées par Claude déclenchent bien les
   previews et la CI.
2. **Ajouter le secret** `CLAUDE_CODE_OAUTH_TOKEN`
   (_Settings → Secrets and variables → Actions → Secrets_). Génère le token
   localement avec ton abonnement **Claude Pro ou Max** :
   ```bash
   claude setup-token
   ```
   et colle la valeur dans le secret. Aucune facturation API : ça consomme ton
   quota d'abonnement (les mêmes limites que ton usage interactif de Claude Code).
3. **Inviter les contributrices comme collaboratrices** (accès _write_) :
   _Settings → Collaborators_. C'est ce statut qui sert de barrière anti-abus —
   les workflows ne se déclenchent que pour le propriétaire ou des collaboratrices
   (`author_association` ∈ `OWNER` / `COLLABORATOR` / `MEMBER`). Une issue ou un
   `@claude` d'un inconnu est ignoré.

> Coûts : chaque exécution consomme des minutes GitHub Actions et puise dans le
> quota de l'abonnement Claude lié au token (mêmes limites que l'usage interactif).
> `--max-turns` borne les boucles.
