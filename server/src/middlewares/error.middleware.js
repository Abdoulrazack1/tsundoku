'use strict';

const env = require('../config/env');

/** Erreur applicative avec statut HTTP. */
class AppError extends Error {
  constructor(message, status = 500, code) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

/** 404 pour les routes API inconnues. */
function notFound(req, res, next) {
  if (req.path.startsWith('/api')) {
    return res.status(404).json({ error: `Route introuvable : ${req.method} ${req.path}` });
  }
  return next();
}

/* eslint-disable no-unused-vars */
/** Gestionnaire d'erreurs global. */
function errorHandler(err, req, res, next) {
  const status = err.status || 500;
  const payload = { error: err.message || 'Erreur interne du serveur.' };
  if (err.code) payload.code = err.code;

  if (status >= 500) {
    // eslint-disable-next-line no-console
    console.error('[error]', err.stack || err.message);
    if (!env.isProd) payload.stack = err.stack;
  }
  res.status(status).json(payload);
}

module.exports = { AppError, notFound, errorHandler };
