// Utilitaires partagés (cf. §3.3 /core/utils.js)

export const qs = (sel, root = document) => root.querySelector(sel);
export const qsa = (sel, root = document) => [...root.querySelectorAll(sel)];

/** Crée un élément avec attributs et enfants. */
export function el(tag, attrs = {}, ...children) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v == null) continue;
    if (k === 'class') node.className = v;
    else if (k === 'html') node.innerHTML = v;
    else if (k.startsWith('on') && typeof v === 'function') node.addEventListener(k.slice(2), v);
    else if (k === 'dataset') Object.assign(node.dataset, v);
    else node.setAttribute(k, v);
  }
  for (const c of children.flat()) {
    if (c == null) continue;
    node.append(c.nodeType ? c : document.createTextNode(c));
  }
  return node;
}

export function debounce(fn, delay = 300) {
  let t;
  return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), delay); };
}

export function escapeHtml(str) {
  if (str == null) return '';
  const div = document.createElement('div');
  div.textContent = String(str);
  return div.innerHTML;
}

/** Nettoie le HTML d'un article (DOMPurify si disponible). */
export function safeHtml(html) {
  if (window.DOMPurify) return window.DOMPurify.sanitize(html, { USE_PROFILES: { html: true } });
  return html;
}

export function formatDate(value, opts = { day: 'numeric', month: 'long', year: 'numeric' }) {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('fr-FR', opts);
}

const STATUS_LABELS = { lu: 'Lu', en_cours: 'En cours', a_lire: 'À lire', abandonne: 'Abandonné', relu: 'Relu' };
export const statusLabel = (s) => STATUS_LABELS[s] || s;

/** Rend des étoiles SVG (note /5). */
export function starsHtml(rating) {
  if (rating == null) return '';
  const full = Math.round(rating * 2) / 2;
  let out = '<span class="stars" aria-label="Note ' + rating + ' sur 5">';
  for (let i = 1; i <= 5; i++) {
    const filled = i <= Math.floor(full);
    const half = !filled && i - 0.5 === full;
    out += `<svg viewBox="0 0 24 24" class="${filled || half ? 'star-full' : 'star-empty'}"><path d="M12 2l2.9 6.3 6.9.7-5.2 4.6 1.5 6.8L12 17.8 5.9 20.4l1.5-6.8L2.2 9l6.9-.7z" stroke="currentColor" stroke-width="1.2"/></svg>`;
  }
  out += `<span class="stars__value">${Number(rating).toFixed(1)} / 5</span></span>`;
  return out;
}

export function coverFallback(src, title = '') {
  return src || `data:image/svg+xml,${encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 200 300'><rect width='200' height='300' fill='%23e8e3db'/><text x='100' y='150' font-family='serif' font-size='14' fill='%238c8c8c' text-anchor='middle'>${title.slice(0, 20)}</text></svg>`
  )}`;
}

export function prefersReducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function getParam(name) {
  return new URLSearchParams(location.search).get(name);
}
