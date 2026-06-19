// Smooth scroll (Lenis) — le liant "awwwards". Synchronisé avec GSAP ScrollTrigger.
import { prefersReducedMotion } from '../core/utils.js';

let lenis = null;

export function initSmoothScroll() {
  if (prefersReducedMotion() || !window.Lenis) return null;

  lenis = new window.Lenis({
    duration: 1.1,
    easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)), // expo-out
    smoothWheel: true,
    wheelMultiplier: 1,
    touchMultiplier: 1.6,
  });

  // Pont GSAP : Lenis pilote le ticker, ScrollTrigger se met à jour.
  if (window.gsap && window.ScrollTrigger) {
    lenis.on('scroll', window.ScrollTrigger.update);
    window.gsap.ticker.add((time) => lenis.raf(time * 1000));
    window.gsap.ticker.lagSmoothing(0);
  } else {
    const raf = (t) => { lenis.raf(t); requestAnimationFrame(raf); };
    requestAnimationFrame(raf);
  }

  // Ancres internes -> scroll fluide
  document.addEventListener('click', (e) => {
    const a = e.target.closest('a[href^="#"]');
    if (!a) return;
    const id = a.getAttribute('href');
    if (id.length < 2) return;
    const target = document.querySelector(id);
    if (target) { e.preventDefault(); lenis.scrollTo(target, { offset: -90 }); }
  });

  window.__lenis = lenis;
  return lenis;
}

export function getLenis() { return lenis; }
