// Curseur personnalisé dot + circle avec lerp (§7.3.D)
import { el, prefersReducedMotion } from '../core/utils.js';

export function initCursor() {
  if (prefersReducedMotion() || window.matchMedia('(hover: none)').matches) return;

  const dot = el('div', { class: 'cursor-dot' });
  const circle = el('div', { class: 'cursor-circle' });
  document.body.append(dot, circle);
  document.body.classList.add('has-custom-cursor');

  let mx = -200, my = -200;
  let cx = mx, cy = my;
  dot.style.opacity = circle.style.opacity = '0';
  addEventListener('mousemove', () => { dot.style.opacity = circle.style.opacity = '1'; }, { once: true });

  addEventListener('mousemove', (e) => { mx = e.clientX; my = e.clientY; dot.style.transform = `translate(${mx}px, ${my}px) translate(-50%,-50%)`; });
  addEventListener('mousedown', () => { dot.classList.add('is-down'); circle.classList.add('is-down'); });
  addEventListener('mouseup', () => { dot.classList.remove('is-down'); circle.classList.remove('is-down'); });

  function loop() {
    cx += (mx - cx) * 0.18;
    cy += (my - cy) * 0.18;
    circle.style.transform = `translate(${cx}px, ${cy}px) translate(-50%,-50%)`;
    requestAnimationFrame(loop);
  }
  loop();

  const hoverSel = 'a, button, .chip, .genre-pill, input, .book-card, .article-card';
  document.addEventListener('mouseover', (e) => {
    if (e.target.closest('.article-card__media, .book-cover')) circle.classList.add('is-media');
    else if (e.target.closest(hoverSel)) circle.classList.add('is-hover');
  });
  document.addEventListener('mouseout', (e) => {
    if (e.target.closest('.article-card__media, .book-cover')) circle.classList.remove('is-media');
    else if (e.target.closest(hoverSel)) circle.classList.remove('is-hover');
  });
}
