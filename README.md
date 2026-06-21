# 積ん読 Tsundoku — Journal de lectures

Blog de lecture full-stack, conçu comme un objet éditorial primé (Awwwards) :
direction artistique japonaise (_ma_ 間 / _wabi-sabi_ 侘寂), washi off-white, vermillon
parcimonieux, typographie Fraunces / Newsreader / Space Grotesk.

> Suit le **détail** du cahier des charges v3 et le **périmètre fonctionnel** de la v4.

---

## Stack technique

| Couche | Technologies |
|---|---|
| **Frontend** | HTML5 · CSS natif (design tokens) · Vanilla JS (ES modules) · GSAP + ScrollTrigger · Lenis (smooth scroll) · Three.js (livre & étagère 3D) · Chart.js (stats) · Editor.js (rédaction) · DOMPurify · Web Speech API (lecture audio) |
| **Backend** | Node.js · Express · mysql2 · JWT (dual-token) · bcryptjs · Joi · Helmet · CORS · express-rate-limit · compression · Winston · Multer · morgan |
| **Base de données** | MySQL 8 (schéma 3NF normalisé) |
| **SEO / diffusion** | **Rendu meta côté serveur** (title/description/canonical/OG/JSON-LD par page, sans JS) · RSS · sitemap.xml (articles + séries) · robots.txt · image Open Graph par défaut |
| **Import d'articles** | Upload direct **.docx** (mammoth) · **.pdf** (pdf.js) · .md · .html · .txt — **remis automatiquement aux polices et couleurs du site** |
| **Intégration** | API GraphQL Anilist (couvertures & métadonnées de mangas réelles) |

---

## Démarrage rapide (Laragon / Windows)

### 1. Prérequis
- **Node.js 20+**
- **MySQL 8** (fourni par Laragon — démarrez-le depuis l'interface Laragon ou le service).

### 2. Installation
```bash
cd server
npm install
```

### 3. Configuration
Le fichier `server/.env` est pré-rempli pour Laragon (root, sans mot de passe).
Ajustez `DB_*` si besoin, et changez les secrets JWT en production.

### 4. Base de données (création + schéma + données de démo + couvertures)
```bash
cd server
npm run db:reset
```
Cela crée la base `tsundoku`, applique le schéma, insère des chroniques de
démonstration et génère des couvertures SVG locales.

### 5. Lancer le serveur
```bash
npm start          # ou : npm run dev  (watch)
```
Le serveur sert **l'API ET le front** sur un seul port :

➡️ **http://localhost:3000**

### 6. Administration
- **URL** : http://localhost:3000/admin/login.html
- **Email** : `admin@tsundoku.app`
- **Mot de passe** : `tsundoku2026`

(modifiables via les variables `SEED_ADMIN_*` du `.env` avant `db:seed`)

---

## Pages

**Front-office** — Accueil · Chroniques (`/articles.html`) · Article
(`/article.html?slug=`) · Bibliothèque (grille / liste / **étagère 3D**) ·
Fiche livre (livre **3D** interactif) · Auteur · Journal de lecture (timeline) ·
Citations · Listes thématiques · En chiffres (**Chart.js**) · À propos · 404.

**Back-office** — Connexion · Tableau de bord (KPIs + graphique) · Gestion des
articles · Gestion des livres (**import Anilist** / upload couverture) ·
Éditeur d'article (**Editor.js**) · Intégrations.

### Couvertures d'œuvres
Pour chaque livre/manga, la couverture peut venir de **trois sources** :
1. **Anilist** — vraie couverture officielle du manga (recherche dans l'éditeur / le gestionnaire de livres) ;
2. **Upload personnel** — votre propre visuel ;
3. **Génération locale** — couverture SVG éditoriale (fallback automatique au seed).

---

## Fonctionnalités immersives
- Hero éditorial (livre posé sur le papier, filigrane kanji, GSAP SplitText)
- Curseur personnalisé (dot + cercle magnétique), boutons magnétiques
- Smooth scroll Lenis + transitions de page (clip-path)
- Navbar Headroom + menu plein écran mobile
- Mode Zen + lecture audio (synthèse vocale) sur les articles
- Barre de progression de lecture, table des matières scrollspy, partage de sélection
- Dark mode (transition douce, choix mémorisé)
- `prefers-reduced-motion` respecté partout

---

## Scripts (`server/`)

| Script | Rôle |
|---|---|
| `npm start` | Démarre le serveur (API + front) |
| `npm run dev` | Idem en mode `--watch` |
| `npm run db:reset` | Schéma + données + couvertures |
| `npm run db:schema` | Schéma seul |
| `npm run db:seed` | Données seules |
| `npm run db:covers` | Régénère les couvertures SVG |
| `npm test` | Tests Jest |

---

## Architecture
```
tsundoku/
├── server/                 # API REST + service statique
│   ├── src/{config,controllers,middlewares,models,routes,services,utils}
│   ├── db/                 # schema.sql, seed.js, generate-covers.js
│   ├── app.js · server.js
└── client/
    ├── public/             # pages HTML (+ /admin)
    ├── assets/css/         # reset · tokens · typography · layout · components · animations · dark-mode · pages/*
    ├── assets/js/{core,components,animations,pages}
    └── uploads/            # médias + couvertures générées
```

## Déploiement

### Option 1 — Docker Compose (tout-en-un, recommandé)
Lance l'app **+ MySQL** en une commande, schéma chargé et base amorcée automatiquement :
```bash
docker compose up -d        # → http://localhost:3000
```
Personnalisable via variables d'env (`JWT_ACCESS_SECRET`, `ANILIST_USERNAME`, `SEED_ADMIN_PASSWORD`…).

### Option 2 — Image Docker pré-construite (publiée par la CI)
```bash
docker run -p 3000:3000 --env-file server/.env ghcr.io/abdoulrazack1/tsundoku:latest
```
L'image est reconstruite et publiée sur **ghcr.io** à chaque push (workflow `docker.yml`).

### Option 3 — PaaS gratuit (cf. cahier §12)
`render.yaml` fourni (Render web service) + BDD MySQL managée (Aiven). CI/CD GitHub Actions
(`ci.yml`) : tests → déclenchement du `RENDER_DEPLOY_HOOK`.

En production : durcir le CSP (Helmet), définir des secrets JWT forts, `NODE_ENV=production`.

---

## Référencement Google

Le site est **prêt à être indexé** : chaque page de contenu (article, fiche série)
est servie avec un `<title>`, une meta description, une URL canonique, des balises
Open Graph/Twitter et du JSON-LD **générés côté serveur** (visibles sans exécuter le
JavaScript) — plus `sitemap.xml`, `robots.txt` et une image de partage par défaut.

Une fois le site **en ligne sur un domaine public**, pour le faire remonter sur Google :

1. Renseigner `SITE_URL=https://votre-domaine` dans `server/.env` (URLs canoniques/sitemap absolues).
2. Créer une propriété sur **Google Search Console** (compte Google requis), choisir la
   vérification par **balise HTML**, copier le code et le mettre dans
   `GOOGLE_SITE_VERIFICATION=…` — il s'injecte automatiquement dans les pages.
3. Dans Search Console : **soumettre le sitemap** `https://votre-domaine/sitemap.xml`.

L'indexation par Google prend ensuite quelques jours.

---
© 2026 Tsundoku — Journal de lectures.
