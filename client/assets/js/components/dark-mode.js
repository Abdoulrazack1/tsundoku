// Toggle dark mode avec persistance (§7.G)
import { qs } from '../core/utils.js';

const KEY = 'tsundoku-theme';

export function initTheme() {
  // Brand-first : le washi clair est la signature. On respecte le choix
  // explicite mémorisé, sinon on reste en clair (et non le système).
  const stored = localStorage.getItem(KEY);
  document.documentElement.setAttribute('data-theme', stored === 'dark' ? 'dark' : 'light');
}

export function initDarkToggle() {
  const btn = qs('.theme-toggle');
  if (!btn) return;
  btn.addEventListener('click', () => {
    const cur = document.documentElement.getAttribute('data-theme');
    const next = cur === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem(KEY, next);
    if (window.gsap) window.gsap.fromTo(btn, { rotate: 0 }, { rotate: 360, duration: 0.5, ease: 'power2.out' });
  });
}
