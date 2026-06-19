// Révélation au scroll (§7.C) — GSAP ScrollTrigger sinon IntersectionObserver
import { qsa, prefersReducedMotion } from '../core/utils.js';

export function initScrollReveal(root = document) {
  const items = qsa('.reveal', root);
  if (!items.length) return;

  if (prefersReducedMotion()) { items.forEach((i) => i.classList.add('is-visible')); return; }

  if (window.gsap && window.ScrollTrigger) {
    const gsap = window.gsap;
    items.forEach((item) => {
      const delay = parseFloat(item.dataset.delay || 0);
      gsap.fromTo(item, { opacity: 0, y: 40 }, {
        opacity: 1, y: 0, duration: 0.8, ease: 'power2.out', delay,
        scrollTrigger: { trigger: item, start: 'top 85%', once: true },
        onStart: () => item.classList.add('is-visible'),
      });
    });
    return;
  }

  // Fallback
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('is-visible'); io.unobserve(e.target); } });
  }, { threshold: 0.15 });
  items.forEach((i) => io.observe(i));
}

/** Révèle les éléments .reveal d'un sous-arbre injecté dynamiquement. */
export function revealNow(root = document) {
  initScrollReveal(root);
  if (window.ScrollTrigger) window.ScrollTrigger.refresh();
}
