'use strict';

/**
 * Enrobe un handler async pour propager les rejets vers le gestionnaire
 * d'erreurs Express sans try/catch répétitif.
 * @param {Function} fn
 */
const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

module.exports = asyncHandler;
