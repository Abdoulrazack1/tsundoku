'use strict';

const WORDS_PER_MINUTE = 200;

/**
 * Calcule le temps de lecture estimé (en minutes, arrondi au supérieur).
 * Le HTML/markdown éventuel est dépouillé avant le comptage des mots.
 *
 * @param {string} content
 * @returns {number} minutes (0 si vide)
 */
function calculateReadingTime(content) {
  if (!content || typeof content !== 'string') return 0;
  const text = content
    .replace(/<[^>]*>/g, ' ') // balises HTML
    .replace(/[#*_>`~\-]+/g, ' ') // syntaxe markdown
    .trim();
  if (!text) return 0;
  const words = text.split(/\s+/).filter(Boolean).length;
  if (words === 0) return 0;
  return Math.max(1, Math.ceil(words / WORDS_PER_MINUTE));
}

module.exports = { calculateReadingTime, WORDS_PER_MINUTE };
