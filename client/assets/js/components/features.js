// Fonctionnalités transverses : lightbox planches, retour-haut, raccourcis, favoris.
import { qs } from '../core/utils.js';
import { toast } from '../core/toast.js';

/* ---------- Favoris (localStorage) ---------- */
const FAV_KEY = 'tsundoku_favs';
export const Favs = {
  all() { try { return JSON.parse(localStorage.getItem(FAV_KEY)) || []; } catch { return []; } },
  has(slug) { return this.all().some((f) => f.slug === slug); },
  toggle(item) {
    const list = this.all();
    const i = list.findIndex((f) => f.slug === item.slug);
    if (i >= 0) list.splice(i, 1); else list.unshift(item);
    localStorage.setItem(FAV_KEY, JSON.stringify(list.slice(0, 200)));
    return i < 0;
  },
};

/* ---------- Lightbox (planches & images d'article) ---------- */
function initLightbox() {
  let box;
  const ensure = () => {
    if (box) return box;
    box = document.createElement('div');
    box.className = 'lightbox';
    box.innerHTML = '<button class="lightbox__close" aria-label="Fermer">✕</button><img alt="">';
    box.addEventListener('click', (e) => { if (e.target === box || e.target.closest('.lightbox__close')) close(); });
    document.body.append(box);
    return box;
  };
  const open = (src, alt) => { ensure(); box.querySelector('img').src = src; box.querySelector('img').alt = alt || ''; box.classList.add('is-open'); document.body.style.overflow = 'hidden'; };
  const close = () => { box?.classList.remove('is-open'); document.body.style.overflow = ''; };

  document.addEventListener('click', (e) => {
    const img = e.target.closest('.article-body img, .prose img, .manga-figure img');
    if (img) { e.preventDefault(); open(img.src, img.alt); }
  });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });
}

/* ---------- Bouton retour-haut ---------- */
function initBackToTop() {
  const btn = document.createElement('button');
  btn.className = 'to-top'; btn.setAttribute('aria-label', 'Retour en haut');
  btn.innerHTML = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 19V5M5 12l7-7 7 7"/></svg>';
  document.body.append(btn);
  btn.addEventListener('click', () => (window.__lenis ? window.__lenis.scrollTo(0) : window.scrollTo({ top: 0, behavior: 'smooth' })));
  addEventListener('scroll', () => btn.classList.toggle('is-visible', window.scrollY > 700), { passive: true });
}

/* ---------- Raccourcis clavier + palette ---------- */
function initShortcuts() {
  const inField = (t) => /INPUT|TEXTAREA|SELECT/.test(t.tagName) || t.isContentEditable;
  addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); qs('.js-search-open')?.click(); return; }
    if (inField(e.target)) return;
    if (e.key === '/') { e.preventDefault(); qs('.js-search-open')?.click(); }
    else if (e.key.toLowerCase() === 't') qs('.theme-toggle')?.click();
    else if (e.key.toLowerCase() === 'h') location.href = '/';
    else if (e.key === '?') toast('Raccourcis : / ou Ctrl+K recherche · T thème · H accueil', { duration: 5000 });
  });
}

export function initFeatures() {
  initLightbox();
  initBackToTop();
  initShortcuts();
}
