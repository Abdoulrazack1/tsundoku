// Page « Ma liste » : favoris + historique (localStorage), avec retrait.
import { qs, escapeHtml, coverFallback } from '../core/utils.js';
import { Favs } from '../components/features.js';

function row(item, removable) {
  return `<a class="article-row reveal" href="/article.html?slug=${item.slug}">
    <img class="article-row__thumb" src="${coverFallback(item.cover || item.cover_image_url, item.title)}" alt="" loading="lazy" style="aspect-ratio:2/3;height:90px;width:60px">
    <div>
      <div class="article-row__title">${escapeHtml(item.title)}</div>
      <div class="text-muted" style="font-size:.85rem">${escapeHtml(item.author || '')}</div>
    </div>
    ${removable ? `<button class="icon-btn js-remove" data-slug="${item.slug}" aria-label="Retirer" onclick="event.preventDefault()"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M6 6l12 12M18 6L6 18"/></svg></button>` : ''}
  </a>`;
}

function renderFavs() {
  const host = qs('#favs');
  const favs = Favs.all();
  host.innerHTML = favs.length
    ? `<div class="stack-list">${favs.map((f) => row(f, true)).join('')}</div>`
    : `<div class="empty"><h3>Aucune sauvegarde</h3><p>Clique sur l'icône marque-page d'une chronique pour la retrouver ici.</p><a class="btn" href="/articles.html">Parcourir les chroniques</a></div>`;
}

function renderRecent() {
  const host = qs('#recent');
  let recent = [];
  try { recent = JSON.parse(localStorage.getItem('tsundoku_recent') || '[]'); } catch { /* ignore */ }
  host.innerHTML = recent.length
    ? `<div class="stack-list">${recent.map((r) => row(r, false)).join('')}</div>`
    : `<p class="text-muted">Aucune lecture récente.</p>`;
}

qs('#favs').addEventListener('click', (e) => {
  const btn = e.target.closest('.js-remove'); if (!btn) return;
  e.preventDefault();
  Favs.toggle({ slug: btn.dataset.slug });
  renderFavs();
});

renderFavs();
renderRecent();
