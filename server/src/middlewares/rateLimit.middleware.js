'use strict';

const rateLimit = require('express-rate-limit');

/** Limiteur global API : 300 requêtes / 15 min par IP (généreux pour le dev). */
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Trop de requêtes. Réessayez dans quelques minutes.' },
});

/** Limiteur strict sur l'authentification : 5 tentatives / 15 min par IP (§9.2 v3). */
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  message: { error: 'Trop de tentatives de connexion. Réessayez plus tard.' },
});

/** Limiteur dépôt public (commentaires, contact) : 5 / 10 min par IP. */
const submitLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Trop d\'envois. Réessaie dans quelques minutes.' },
});

module.exports = { apiLimiter, authLimiter, submitLimiter };
