// Connexion / inscription utilisateur (membre).
import { qs, qsa, getParam } from '../core/utils.js';
import { api, setToken } from '../core/api.js';

// Déjà connecté ? -> compte
api.tryRefresh().then((ok) => { if (ok) location.replace('/compte.html'); });

// Onglets
qsa('.auth-tab').forEach((tab) => tab.addEventListener('click', () => {
  qsa('.auth-tab').forEach((t) => t.classList.toggle('is-active', t === tab));
  qsa('.auth-form').forEach((f) => f.classList.toggle('is-active', f.id === `${tab.dataset.tab}-form`));
}));

const redirect = () => location.assign(getParam('next') || '/compte.html');

qs('#login-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const err = qs('#login-err'); err.textContent = '';
  const btn = e.target.querySelector('button'); btn.disabled = true;
  const { email, password } = Object.fromEntries(new FormData(e.target));
  try {
    const { accessToken } = await api.post('/auth/login', { email, password });
    setToken(accessToken);
    redirect();
  } catch (ex) {
    err.textContent = ex.status === 401 ? 'Email ou mot de passe incorrect.' : (ex.message || 'Erreur.');
    btn.disabled = false;
  }
});

qs('#register-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const err = qs('#register-err'); err.textContent = '';
  if (e.target.website.value) return; // honeypot
  const btn = e.target.querySelector('button'); btn.disabled = true;
  const { username, email, password } = Object.fromEntries(new FormData(e.target));
  try {
    const { accessToken } = await api.post('/auth/register', { username, email, password });
    setToken(accessToken);
    redirect();
  } catch (ex) {
    err.textContent = ex.message || 'Erreur lors de la création du compte.';
    btn.disabled = false;
  }
});
