'use strict';

/**
 * Nettoyage HTML serveur (défense en profondeur côté backend, en complément
 * de DOMPurify côté client — cf. §10.3). Supprime les vecteurs XSS les plus
 * courants : balises script/style/iframe, gestionnaires on*, et URLs javascript:.
 *
 * On reste volontairement conservateur : on ne reconstruit pas un parseur HTML
 * complet, on neutralise les motifs dangereux.
 *
 * @param {string} html
 * @returns {string}
 */
function sanitizeHtml(html) {
  if (!html || typeof html !== 'string') return '';
  return html
    .replace(/<\s*(script|style|iframe|object|embed)[^>]*>[\s\S]*?<\s*\/\s*\1\s*>/gi, '')
    .replace(/<\s*(script|style|iframe|object|embed)[^>]*\/?>/gi, '')
    .replace(/\son\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '') // handlers inline
    .replace(/(href|src)\s*=\s*("|')?\s*javascript:[^"'>\s]*/gi, '$1="#"');
}

/** Échappe les caractères HTML pour un affichage en texte brut. */
function escapeHtml(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

module.exports = { sanitizeHtml, escapeHtml };
