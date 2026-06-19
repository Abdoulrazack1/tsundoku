// Navbar : Headroom (hide/show) + fond au scroll + menu mobile (§5.1 / §7.F)
import { qs, qsa } from '../core/utils.js';

export function initNavbar() {
  const nav = qs('.navbar');
  if (!nav) return;
  let lastY = window.scrollY;
  let ticking = false;

  const onScroll = () => {
    const y = window.scrollY;
    nav.classList.toggle('is-scrolled', y > 80);
    // Ne pas masquer la navbar quand le menu mobile est ouvert
    if (!document.body.classList.contains('menu-open')) {
      if (y > lastY && y > 240) nav.classList.add('is-hidden');
      else nav.classList.remove('is-hidden');
    }
    lastY = y;
    ticking = false;
  };
  window.addEventListener('scroll', () => {
    if (!ticking) { requestAnimationFrame(onScroll); ticking = true; }
  }, { passive: true });

  // --- Menu mobile ---
  const burger = qs('.nav-burger');
  const menu = qs('#mobile-menu');
  const closeMenu = () => {
    document.body.classList.remove('menu-open');
    burger?.setAttribute('aria-expanded', 'false');
    menu?.setAttribute('aria-hidden', 'true');
  };
  const toggleMenu = () => {
    const open = !document.body.classList.contains('menu-open');
    document.body.classList.toggle('menu-open', open);
    burger?.setAttribute('aria-expanded', String(open));
    menu?.setAttribute('aria-hidden', String(!open));
  };
  burger?.addEventListener('click', toggleMenu);
  menu?.querySelectorAll('a').forEach((a) => a.addEventListener('click', closeMenu));
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeMenu(); });

  // --- Lien courant (desktop + mobile) ---
  const path = location.pathname.replace(/index\.html$/, '').replace(/\/$/, '') || '/';
  qsa('.navbar__nav a, .mobile-menu__nav a').forEach((a) => {
    const href = a.getAttribute('href');
    const base = href.replace('.html', '');
    if (href === path || (href !== '/' && (path === base || path.startsWith(base)))) {
      a.setAttribute('aria-current', 'page');
    }
  });
}
