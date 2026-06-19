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
  initPageTransition();
  initScrollReveal();

  const year = qs('#year');
  if (year) year.textContent = new Date().getFullYear();
});
