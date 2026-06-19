// Page À propos : formulaire de contact (validation client) + révélations.
import { qs } from '../core/utils.js';
import { toast } from '../core/toast.js';

const form = qs('.js-contact');
const msg = form?.querySelector('.newsletter__msg');

form?.addEventListener('submit', (e) => {
  e.preventDefault();
  const data = Object.fromEntries(new FormData(form));
  if (!data.name || !data.email || !data.message) { msg.textContent = 'Merci de remplir tous les champs.'; return; }
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(data.email)) { msg.textContent = 'Adresse email invalide.'; return; }
  // Pas d'endpoint de contact dans la version initiale : ouverture du client mail.
  const subject = encodeURIComponent('Tsundoku — message de ' + data.name);
  const body = encodeURIComponent(`${data.message}\n\n— ${data.name} (${data.email})`);
  window.location.href = `mailto:bonjour@tsundoku.app?subject=${subject}&body=${body}`;
  msg.textContent = '';
  form.reset();
  toast('Merci ! Votre message est prêt à être envoyé.', { type: 'success' });
});
