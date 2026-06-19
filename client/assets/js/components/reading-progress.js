// Barre de progression de lecture (§5.3 / §7.I)
import { qs } from '../core/utils.js';

export function initReadingProgress() {
  const bar = qs('.progress-bar-read');
  const article = qs('.article-body');
  if (!bar || !article) return;

  let ticking = false;
  const update = () => {
    const docH = document.documentElement.scrollHeight - window.innerHeight;
    const pct = docH > 0 ? (window.scrollY / docH) * 100 : 0;
    bar.style.width = `${Math.min(100, Math.max(0, pct))}%`;
    ticking = false;
  };
  window.addEventListener('scroll', () => {
    if (!ticking) { requestAnimationFrame(update); ticking = true; }
  }, { passive: true });
  update();
}
