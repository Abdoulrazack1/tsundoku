// Page Contact : envoi vers /api/contact.
import { qs } from '../core/utils.js';
import { api } from '../core/api.js';
import { toast } from '../core/toast.js';

const form = qs('#contact-form');
const msg = qs('#contact-msg');

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  msg.textContent = '';
  const data = Object.fromEntries(new FormData(form));
  if (!data.name?.trim() || !data.message?.trim() || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(data.email || '')) {
    msg.style.color = '#e74c3c'; msg.textContent = 'Nom, email valide et message requis.'; return;
  }
  const btn = form.querySelector('button'); btn.disabled = true;
  try {
    const r = await api.post('/contact', data);
    msg.style.color = 'var(--color-accent)'; msg.textContent = r.message;
    form.reset();
    toast('Message envoyé', { type: 'success' });
  } catch (err) { msg.style.color = '#e74c3c'; msg.textContent = err.message; }
  finally { btn.disabled = false; }
});
