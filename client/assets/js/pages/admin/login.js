// Connexion admin (§6.1).
import { api, setToken } from '../../core/api.js';
import { qs } from '../../core/utils.js';
import { initTheme } from '../../components/dark-mode.js';

initTheme();

const form = qs('#login-form');
const errEl = qs('#login-error');

// Déjà connecté ? on file au dashboard.
api.tryRefresh().then((ok) => { if (ok) location.href = '/admin/dashboard.html'; });

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  errEl.textContent = '';
  const btn = form.querySelector('button');
  btn.disabled = true;
  const { email, password } = Object.fromEntries(new FormData(form));
  try {
    const { accessToken } = await api.post('/auth/login', { email, password });
    setToken(accessToken);
    location.href = '/admin/dashboard.html';
  } catch (err) {
    errEl.textContent = err.status === 401 ? 'Email ou mot de passe incorrect.' : (err.message || 'Erreur de connexion.');
    btn.disabled = false;
  }
});
