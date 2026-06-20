// Toggle dark mode avec persistance (§7.G)
import { qs } from '../core/utils.js';

const KEY = 'tsundoku-theme';

const THEMES = ['light', 'dark', 'sepia']; // sépia = confort de lecture (lumière chaude)

export function initTheme() {
  const stored = localStorage.getItem(KEY);
  document.documentElement.setAttribute('data-theme', THEMES.includes(stored) ? stored : 'light');
}

export function initDarkToggle() {
  const btn = qs('.theme-toggle');
  if (!btn) return;
  btn.title = 'Thème : clair / sombre / sépia';
  btn.addEventListener('click', () => {
    const cur = document.documentElement.getAttribute('data-theme') || 'light';
    const next = THEMES[(THEMES.indexOf(cur) + 1) % THEMES.length];
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem(KEY, next);
    if (window.gsap) window.gsap.fromTo(btn, { rotate: 0 }, { rotate: 360, duration: 0.5, ease: 'power2.out' });
  });
}
