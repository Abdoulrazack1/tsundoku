// Initialisation GSAP globale (§7.2)
import { prefersReducedMotion } from '../core/utils.js';

export function initGsap() {
  if (!window.gsap) { document.documentElement.classList.add('no-gsap'); return false; }
  if (window.ScrollTrigger) window.gsap.registerPlugin(window.ScrollTrigger);
  if (prefersReducedMotion()) window.gsap.globalTimeline.timeScale(100); // neutralise les durées
  return true;
}

/** Animation d'entrée façon SplitText (lettre par lettre, mots insécables). */
export function splitReveal(node, { stagger = 0.025, duration = 0.8, delay = 0.2 } = {}) {
  if (!node || !window.gsap || prefersReducedMotion()) return;
  const text = node.textContent;
  node.setAttribute('aria-label', text);
  // On découpe par mots (insécables) puis par caractères, pour ne jamais
  // casser un mot en plein milieu lors du retour à la ligne.
  node.innerHTML = text.split(' ').map((word) =>
    `<span class="split-word" aria-hidden="true">${[...word].map((c) => `<span class="split-char">${c}</span>`).join('')}</span>`
  ).join(' ');
  window.gsap.fromTo(node.querySelectorAll('.split-char'),
    { yPercent: 115, opacity: 0 },
    { yPercent: 0, opacity: 1, stagger, duration, delay, ease: 'power3.out' });
}
