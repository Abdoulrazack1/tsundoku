// Transitions de page via overlay clip-path (§7.B)
import { el, prefersReducedMotion } from '../core/utils.js';

export function initPageTransition() {
  if (prefersReducedMotion()) return;
  const veil = el('div', { class: 'page-veil' });
  document.body.append(veil);

  // Sortie de page : intercepte les liens internes
  document.addEventListener('click', (e) => {
    const link = e.target.closest('a');
    if (!link) return;
    const href = link.getAttribute('href');
    if (!href || link.target === '_blank' || href.startsWith('#') || href.startsWith('http') || href.startsWith('mailto') || link.hasAttribute('data-no-transition')) return;
    if (link.origin !== location.origin) return;
    e.preventDefault();
    veil.classList.add('is-in');
    setTimeout(() => { window.location.href = href; }, 480);
  });

  // Entrée de page
  window.addEventListener('pageshow', () => {
    veil.classList.remove('is-in');
    veil.classList.add('is-out');
    setTimeout(() => veil.classList.remove('is-out'), 520);
  });
}
