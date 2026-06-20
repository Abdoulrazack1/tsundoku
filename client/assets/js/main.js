// Boot global — initialise les composants partagés sur toutes les pages.
import { initTheme, initDarkToggle } from './components/dark-mode.js';
import { mountChrome } from './components/layout.js';
import { initNavbar } from './components/navbar.js';
import { initSearch } from './components/search-overlay.js';
import { initNewsletter } from './components/newsletter.js';
import { initGsap } from './animations/gsap-init.js';
import { initCursor } from './animations/cursor.js';
import { initScrollReveal } from './animations/scroll-reveal.js';
import { initPageTransition } from './animations/page-transition.js';
import { initSmoothScroll } from './animations/smooth-scroll.js';
import { initMagnetic } from './animations/magnetic.js';
import { initFeatures } from './components/features.js';
import { qs } from './core/utils.js';

// Thème appliqué le plus tôt possible (évite le flash)
initTheme();

document.addEventListener('DOMContentLoaded', () => {
  mountChrome();
  initGsap();
  initSmoothScroll();
  initNavbar();
  initDarkToggle();
  initSearch();
  initNewsletter();
  initCursor();
  initMagnetic();
  initFeatures();
  initPageTransition();
  initScrollReveal();

  initSEO();
  initPWA();

  const year = qs('#year');
  if (year) year.textContent = new Date().getFullYear();
});

/** PWA : manifest, thème, favicon, service worker. */
function initPWA() {
  const head = document.head;
  const addLink = (rel, href, attrs = {}) => {
    if (document.querySelector(`link[rel="${rel}"]`)) return;
    const l = document.createElement('link'); l.rel = rel; l.href = href;
    Object.entries(attrs).forEach(([k, v]) => l.setAttribute(k, v));
    head.append(l);
  };
  addLink('manifest', '/manifest.webmanifest');
  addLink('icon', '/assets/img/icon.svg', { type: 'image/svg+xml' });
  addLink('apple-touch-icon', '/assets/img/icon.svg');
  if (!document.querySelector('meta[name="theme-color"]')) {
    const m = document.createElement('meta'); m.name = 'theme-color';
    m.content = document.documentElement.getAttribute('data-theme') === 'dark' ? '#0d0d0d' : '#f5f0e8';
    head.append(m);
  }
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => navigator.serviceWorker.register('/service-worker.js').catch(() => {}));
  }
}

/** SEO de base appliqué à toutes les pages (canonical + Open Graph par défaut).
 *  Les pages riches (article) surchargent ensuite ces balises. */
function initSEO() {
  const head = document.head;
  const desc = document.querySelector('meta[name="description"]')?.content || '';
  const url = location.origin + location.pathname + location.search;
  const ensure = (selector, create) => { let n = document.querySelector(selector); if (!n) { n = create(); head.append(n); } return n; };
  const canonical = ensure('link[rel="canonical"]', () => Object.assign(document.createElement('link'), { rel: 'canonical' }));
  canonical.href = url;
  const og = (prop, val) => { if (!val) return; const n = ensure(`meta[property="${prop}"]`, () => { const m = document.createElement('meta'); m.setAttribute('property', prop); return m; }); n.setAttribute('content', val); };
  og('og:site_name', 'Tsundoku');
  og('og:title', document.title);
  og('og:description', desc);
  og('og:url', url);
  if (!document.querySelector('meta[property="og:type"]')) og('og:type', 'website');
}
