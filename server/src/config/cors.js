'use strict';

const env = require('./env');

/**
 * Whitelist d'origines autorisées. En mono-serveur (le backend sert aussi
 * le front statique), les requêtes same-origin n'ont pas besoin de CORS,
 * mais on autorise l'origine configurée pour un déploiement découplé.
 */
const whitelist = [
  env.corsOrigin,
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'http://localhost:5500',
  'http://127.0.0.1:5500',
];

const corsOptions = {
  origin(origin, callback) {
    // Autorise les outils sans origin (curl, same-origin) et la whitelist.
    if (!origin || whitelist.includes(origin)) return callback(null, true);
    return callback(new Error(`Origine non autorisée par CORS : ${origin}`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};

module.exports = corsOptions;
