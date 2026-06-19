'use strict';

/**
 * Convertit une chaîne en slug URL-friendly.
 * - met en minuscules
 * - retire les accents (normalisation NFD + suppression des diacritiques U+0300–U+036F)
 * - remplace les caractères non alphanumériques par des tirets
 * - supprime les tirets en début/fin et les doublons
 *
 * @param {string} text
 * @returns {string}
 */
function slugify(text) {
  if (!text || typeof text !== 'string') return '';
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // diacritiques combinants
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '') // caractères spéciaux
    .replace(/[\s_-]+/g, '-') // espaces & underscores -> tiret
    .replace(/^-+|-+$/g, ''); // tirets aux extrémités
}

module.exports = slugify;
