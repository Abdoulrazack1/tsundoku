// Bibliothèque (§5.4) : filtres statut, recherche, tri, vues grille/liste/étagère 3D.
import { api } from '../core/api.js';
import { qs, qsa, debounce } from '../core/utils.js';
import { bookCard } from '../components/cards.js';
import { initShelf3D } from '../animations/book-3d.js';
import { revealNow } from '../animations/scroll-reveal.js';

const grid = qs('#books-grid');
const root = qs('.library');
const state = { status: '', q: '', sort: 'newest', view: 'grid' };
let shelfBuilt = false;
let lastBooks = [];

const STATUSES = [['', 'Tous'], ['lu', 'Lu'], ['en_cours', 'En cours'], ['a_lire', 'À lire'], ['relu', 'Relu'], ['abandonne', 'Abandonné']];

function renderStatusFilters() {
  const host = qs('#status-filters');
  host.innerHTML = STATUSES.map(([v, l]) => `<button class="chip ${state.status === v ? 'is-active' : ''}" data-st="${v}">${l}</button>`).join('');
  host.addEventListener('click', (e) => {
    const b = e.target.closest('[data-st]'); if (!b) return;
    state.status = b.dataset.st;
    qsa('#status-filters .chip').forEach((c) => c.classList.toggle('is-active', c === b));
    load();
  });
}

async function load() {
  grid.innerHTML = '<div class="spinner"></div>';
  try {
    const params = new URLSearchParams({ sort: state.sort, limit: '60' });
    if (state.status) params.set('status', state.status);
    if (state.q) params.set('q', state.q);
    const { books } = await api.get(`/books?${params}`);
    lastBooks = books;

    if (!books.length) {
      grid.innerHTML = `<div class="empty" style="grid-column:1/-1"><h3>Bibliothèque vide</h3><p>Aucun livre ne correspond. Ajoutez vos premiers livres pour commencer le voyage.</p></div>`;
      return;
    }
    grid.innerHTML = books.map(bookCard).join('');
    revealNow(grid);
    if (state.view === 'shelf') buildShelf();
  } catch (err) {
    grid.innerHTML = `<div class="empty" style="grid-column:1/-1"><h3>Erreur</h3><p>${err.message}</p></div>`;
  }
}

function buildShelf() {
  const host = qs('#shelf-3d');
  initShelf3D(host, lastBooks);
  shelfBuilt = true;
}

function setView(view) {
  state.view = view;
  qsa('.view-toggle button').forEach((b) => b.classList.toggle('is-active', b.dataset.view === view));
  grid.classList.toggle('is-list', view === 'list');
  root.classList.toggle('is-shelf', view === 'shelf');
  if (view === 'shelf' && lastBooks.length) buildShelf();
}

function initControls() {
  qs('#lib-search').addEventListener('input', debounce((e) => { state.q = e.target.value.trim(); load(); }, 300));
  qs('#lib-sort').addEventListener('change', (e) => { state.sort = e.target.value; load(); });
  qsa('.view-toggle button').forEach((b) => b.addEventListener('click', () => setView(b.dataset.view)));
}

async function loadAnilistRanking() {
  try {
    const data = await api.get('/integration/anilist/user');
    if (!data.configured || !data.entries?.length) return;
    const sec = qs('#anilist-section');
    const rail = qs('#anilist-rail');
    qs('#anilist-title').textContent = `Sur Anilist — ${data.username}`;
    if (data.user?.siteUrl) qs('#anilist-profile').href = data.user.siteUrl;
    const STAT = { lu: 'Lu', en_cours: 'En cours', a_lire: 'À lire', abandonne: 'Abandonné', pause: 'En pause', relu: 'Relu' };
    rail.innerHTML = data.entries.slice(0, 24).map((e) => `
      <a class="ani-card" href="https://anilist.co/manga/${e.anilist_id}" target="_blank" rel="noopener" title="${e.title.replace(/"/g, '')}">
        <div class="ani-card__cover"><img src="${e.cover_image_url || ''}" alt="" loading="lazy">
          ${e.score ? `<span class="ani-card__score">${e.score}</span>` : ''}
        </div>
        <div class="ani-card__title">${e.title}</div>
        <div class="ani-card__meta">${STAT[e.status] || ''}${e.progress ? ` · ${e.progress} ch.` : ''}</div>
      </a>`).join('');
    sec.hidden = false;
  } catch { /* Anilist non configuré ou hors-ligne : section masquée */ }
}

renderStatusFilters();
initControls();
load();
loadAnilistRanking();
