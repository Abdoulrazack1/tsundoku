// Mon compte (membre) : profil + favoris + historique + déconnexion.
import { qs, escapeHtml, coverFallback } from '../core/utils.js';
import { api, setToken } from '../core/api.js';
import { Favs } from '../components/features.js';

function row(item, removable) {
  return `<a class="article-row reveal" href="/article.html?slug=${item.slug}">
    <img class="article-row__thumb" src="${coverFallback(item.cover || item.cover_image_url, item.title)}" alt="" loading="lazy" style="aspect-ratio:2/3;height:90px;width:60px">
    <div><div class="article-row__title">${escapeHtml(item.title)}</div>
    <div class="text-muted" style="font-size:.85rem">${escapeHtml(item.author || '')}</div></div>
    ${removable ? `<button class="icon-btn js-remove" data-slug="${item.slug}" aria-label="Retirer" onclick="event.preventDefault()"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M6 6l12 12M18 6L6 18"/></svg></button>` : ''}
  </a>`;
}

function renderFavs() {
  const host = qs('#account-favs');
  const favs = Favs.all();
  host.innerHTML = favs.length ? `<div class="stack-list">${favs.map((f) => row(f, true)).join('')}</div>`
    : `<div class="empty"><h3>Rien de sauvegardé</h3><p>Ajoute des chroniques à ta liste avec l'icône marque-page.</p><a class="btn" href="/articles.html">Parcourir</a></div>`;
}
function renderRecent() {
  const host = qs('#account-recent');
  let recent = []; try { recent = JSON.parse(localStorage.getItem('tsundoku_recent') || '[]'); } catch { /* */ }
  host.innerHTML = recent.length ? `<div class="stack-list">${recent.map((r) => row(r, false)).join('')}</div>` : '<p class="text-muted">Aucune lecture récente.</p>';
}

async function main() {
  // Garde : membre connecté requis
  let user;
  try { user = (await api.auth.get('/auth/me')).user; }
  catch { const ok = await api.tryRefresh(); if (ok) { try { user = (await api.auth.get('/auth/me')).user; } catch { /* */ } } }
  if (!user) { location.replace('/login.html?next=/compte.html'); return; }
  if (user.role === 'admin') { location.replace('/admin/dashboard.html'); return; }

  qs('#account-name').textContent = user.username;
  qs('#account-email').textContent = user.email;
  renderFavs();
  renderRecent();

  qs('#account-favs').addEventListener('click', (e) => {
    const btn = e.target.closest('.js-remove'); if (!btn) return;
    e.preventDefault(); Favs.toggle({ slug: btn.dataset.slug }); renderFavs();
  });
  qs('#logout-btn').addEventListener('click', async () => {
    await api.post('/auth/logout').catch(() => {});
    setToken(null);
    location.assign('/');
  });
}

main();
