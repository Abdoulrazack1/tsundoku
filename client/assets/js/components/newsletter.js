// Formulaire newsletter (§5.1 section 6)
import { qsa } from '../core/utils.js';
import { api } from '../core/api.js';

export function initNewsletter() {
  qsa('.js-newsletter').forEach((form) => {
    const msg = form.querySelector('.newsletter__msg');
    const input = form.querySelector('input[type="email"]');
    const btn = form.querySelector('button');

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = input.value.trim();
      if (!email) return;
      btn.disabled = true;
      if (msg) msg.textContent = '';
      try {
        const res = await api.post('/newsletter/subscribe', { email });
        if (msg) { msg.style.color = 'var(--color-accent)'; msg.textContent = res.message; }
        if (window.gsap && msg) window.gsap.fromTo(msg, { opacity: 0, y: 8 }, { opacity: 1, y: 0, duration: 0.5 });
        form.reset();
      } catch (err) {
        if (msg) { msg.style.color = '#e74c3c'; msg.textContent = err.message || 'Une erreur est survenue.'; }
      } finally { btn.disabled = false; }
    });
  });
}
