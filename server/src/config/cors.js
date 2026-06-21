'use strict';

const env = require('./env');

/**
 * Whitelist d'origines autorisées. En mono-serveur (le backend sert aussi
 * le front statique), les requêtes same-origin n'ont pas besoin de CORS,
 * mais on autorise l'origine configurée pour un déploiement découplé.
 */
const whitelist = [
  ...String(env.corsOrigin || '').split(',').map((s) => s.trim()), // liste séparée par des virgules
  env.siteUrl,
  process.env.RENDER_EXTERNAL_URL, // URL publique injectée automatiquement par Render
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'http://localhost:5500',
  'http://127.0.0.1:5500',
].filter(Boolean);

const corsOptions = {
  origin(origin, callback) {
    // Autorise les outils sans origin (curl, same-origin) et la whitelist.
    if (!origin || whitelist.includes(origin)) return callback(null, true);
    // Origine inconnue : on refuse PROPREMENT (pas de header CORS) sans lever
    // d'erreur — évite tout 500/crash ; le navigateur bloquera la requête croisée.
    return callback(null, false);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};

module.exports = corsOptions;
