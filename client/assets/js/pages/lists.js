// Listes thématiques (§5.8) : grille de collections.
import { api } from '../core/api.js';
import { qs, escapeHtml, coverFallback } from '../core/utils.js';
import { revealNow } from '../animations/scroll-reveal.js';

const grid = qs('#lists-grid');

function card(l) {
  return `<a class="list-card reveal" href="/list.html?slug=${l.slug}">
    <img class="list-card__cover" src="${coverFallback(l.cover_image_url, l.title)}" alt="" loading="lazy">
    <div class="list-card__body">
      <h2 class="list-card__title">${escapeHtml(l.title)}</h2>
      <p class="text-muted" style="margin-top:8px">${escapeHtml(l.description || '')}</p>
      <p class="kicker" style="margin-top:12px">${l.books_count} livre${l.books_count > 1 ? 's' : ''}</p>
    </div>
  </a>`;
}

async function load() {
  try {
    const { lists } = await api.get('/lists');
    if (!lists.length) { grid.innerHTML = `<div class="empty"><h3>Aucune liste</h3><p>Les collections thématiques apparaîtront ici.</p></div>`; return; }
    grid.innerHTML = lists.map(card).join('');
    revealNow(grid);
  } catch (err) {
    grid.innerHTML = `<div class="empty"><h3>Erreur</h3><p>${err.message}</p></div>`;
  }
}

load();
