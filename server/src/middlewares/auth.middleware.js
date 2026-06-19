'use strict';

const jwt = require('jsonwebtoken');
const env = require('../config/env');

/**
 * Vérifie l'access token (Bearer) et attache req.user.
 * Stratégie dual-token (cf. §10.1) : l'access token est de courte durée.
 */
function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;

  if (!token) {
    return res.status(401).json({ error: 'Authentification requise.' });
  }
  try {
    const payload = jwt.verify(token, env.jwt.accessSecret);
    req.user = { id: payload.sub, role: payload.role, username: payload.username };
    return next();
  } catch (err) {
    const code = err.name === 'TokenExpiredError' ? 'TOKEN_EXPIRED' : 'TOKEN_INVALID';
    return res.status(401).json({ error: 'Token invalide ou expiré.', code });
  }
}

/** Restreint l'accès aux rôles donnés. */
function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Accès interdit.' });
    }
    return next();
  };
}

module.exports = { requireAuth, requireRole };
