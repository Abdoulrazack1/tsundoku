// Chrome partagé : navbar + menu mobile + footer, injectés depuis une source unique.
import { qs } from '../core/utils.js';

const NAV_LINKS = [
  ['Chroniques', '/articles.html'],
  ['Dossiers', '/articles.html?type=dossier'],
  ['Bibliothèque', '/library.html'],
  ['Journal', '/journal.html'],
  ['À propos', '/about.html'],
];

function logo(small = false) {
  return `<a class="logo${small ? ' logo--sm' : ''}" href="/" aria-label="Tsundoku, accueil" data-cursor="link">
    <span class="logo__mark"><span class="logo__kanji">読</span></span>
    <span class="logo__type">Tsundoku</span>
  </a>`;
}

function searchIcon() {
  return `<button class="icon-btn js-search-open" aria-label="Rechercher" data-cursor="link">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></svg>
  </button>`;
}

function themeIcon() {
  return `<button class="icon-btn theme-toggle" aria-label="Basculer le thème clair / sombre" data-cursor="link">
    <svg class="moon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M21 12.8A9 9 0 1111.2 3a7 7 0 009.8 9.8z"/></svg>
    <svg class="sun" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="4.5"/><path d="M12 2v2M12 20v2M4 12H2M22 12h-2M5 5l1.5 1.5M17.5 17.5L19 19M19 5l-1.5 1.5M6.5 17.5L5 19"/></svg>
  </button>`;
}

function navbarHTML() {
  return `<nav class="navbar" aria-label="Navigation principale"><div class="container navbar__inner">
    ${logo()}
    <div class="navbar__nav">
      ${NAV_LINKS.map(([t, h]) => `<a class="nav-link" href="${h}" data-cursor="link"><span>${t}</span></a>`).join('')}
    </div>
    <div class="navbar__actions">
      <button class="icon-btn js-random" aria-label="Une chronique au hasard" title="Au hasard (R)" data-cursor="link">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="8" cy="8" r="1.3" fill="currentColor"/><circle cx="16" cy="16" r="1.3" fill="currentColor"/><circle cx="16" cy="8" r="1.3" fill="currentColor"/><circle cx="8" cy="16" r="1.3" fill="currentColor"/></svg>
      </button>
      ${searchIcon()}
      ${themeIcon()}
      <button class="nav-burger" aria-label="Ouvrir le menu" aria-expanded="false" data-cursor="link">
        <span></span><span></span>
      </button>
    </div>
  </div></nav>`;
}

function mobileMenuHTML() {
  return `<div class="mobile-menu" id="mobile-menu" aria-hidden="true">
    <div class="mobile-menu__inner">
      <nav class="mobile-menu__nav" aria-label="Navigation mobile">
        ${NAV_LINKS.map(([t, h], i) => `<a href="${h}" style="--i:${i}"><span class="mobile-menu__index">0${i + 1}</span>${t}</a>`).join('')}
      </nav>
      <div class="mobile-menu__foot">
        <span>積ん読</span>
        <a href="/admin/login.html">Administration</a>
      </div>
    </div>
  </div>`;
}

function footerHTML() {
  return `<footer class="footer"><div class="container">
    <p class="footer__haiku">積ん読 — 本の山</p>
    <div class="footer__grid">
      <div class="footer__brand">
        ${logo(true)}
        <p>Le journal de lectures où les piles de promesses deviennent des expériences partagées.</p>
      </div>
      <div class="footer__col">
        <h4>Explorer</h4>
        <a href="/articles.html">Chroniques</a>
        <a href="/articles.html?type=dossier">Dossiers</a>
        <a href="/library.html">Bibliothèque</a>
        <a href="/journal.html">Journal de lecture</a>
        <a href="/tags.html">Tags</a>
        <a href="/favorites.html">Ma liste</a>
        <a href="/stats.html">En chiffres</a>
      </div>
      <div class="footer__col">
        <h4>Le projet</h4>
        <a href="/about.html">À propos</a>
        <a href="/lists.html">Listes thématiques</a>
        <a href="/newsletter.html">Newsletter</a>
        <a href="/rss.xml">Flux RSS</a>
        <a href="/admin/login.html">Administration</a>
      </div>
      <div class="footer__col">
        <h4>Suivre</h4>
        <div class="footer__social">
          <a href="https://x.com/20thHeir" target="_blank" rel="noopener" aria-label="X (Twitter)" data-cursor="link"><svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M18 3h3l-7 8 8 10h-6l-5-6-5 6H3l8-9L3 3h6l4 5z"/></svg></a>
          <a href="/rss.xml" aria-label="Flux RSS" data-cursor="link"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M4 11a9 9 0 019 9M4 4a16 16 0 0116 16"/><circle cx="5" cy="19" r="1.5" fill="currentColor"/></svg></a>
          <a href="/newsletter.html" aria-label="Newsletter" data-cursor="link"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/></svg></a>
        </div>
      </div>
    </div>
    <div class="footer__bottom">
      <span>© <span id="year">2026</span> Tsundoku — Journal de lectures</span>
      <span><a href="/legal.html">Mentions légales</a> · <a href="/privacy.html">Confidentialité</a></span>
    </div>
  </div></footer>`;
}

export function mountChrome() {
  const navSlot = qs('[data-navbar]');
  const footSlot = qs('[data-footer]');
  if (navSlot) navSlot.outerHTML = navbarHTML() + mobileMenuHTML();
  if (footSlot) footSlot.outerHTML = footerHTML();
}
