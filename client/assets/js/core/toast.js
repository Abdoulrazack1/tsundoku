// Système de toasts (notifications non bloquantes — §19.3)
import { el } from './utils.js';

let stack;
function ensureStack() {
  if (!stack) { stack = el('div', { class: 'toast-stack', 'aria-live': 'polite' }); document.body.append(stack); }
  return stack;
}

export function toast(message, { type = 'default', duration = 3500 } = {}) {
  const node = el('div', { class: `toast toast--${type}` }, message);
  ensureStack().append(node);
  requestAnimationFrame(() => node.classList.add('is-visible'));
  setTimeout(() => {
    node.classList.remove('is-visible');
    setTimeout(() => node.remove(), 300);
  }, duration);
}
