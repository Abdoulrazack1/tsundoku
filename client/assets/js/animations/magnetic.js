// Effet magnétique : les cibles s'attirent légèrement vers le curseur.
import { qsa, prefersReducedMotion } from '../core/utils.js';

export function initMagnetic() {
  if (prefersReducedMotion() || !window.matchMedia('(pointer:fine)').matches) return;
  const targets = qsa('[data-magnetic], .icon-btn, .btn--solid, .nav-burger');
  const strength = 0.35;

  targets.forEach((elm) => {
    let raf = null;
    const move = (e) => {
      const r = elm.getBoundingClientRect();
      const x = (e.clientX - (r.left + r.width / 2)) * strength;
      const y = (e.clientY - (r.top + r.height / 2)) * strength;
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => { elm.style.transform = `translate(${x}px, ${y}px)`; });
    };
    const reset = () => {
      cancelAnimationFrame(raf);
      elm.style.transform = '';
      elm.style.transition = 'transform 0.4s cubic-bezier(0.25,0.46,0.45,0.94)';
      setTimeout(() => { elm.style.transition = ''; }, 400);
    };
    elm.addEventListener('mousemove', move);
    elm.addEventListener('mouseleave', reset);
  });
}
