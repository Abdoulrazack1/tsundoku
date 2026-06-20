// Liste des chroniques (§5.2) : filtres, tri, vues grille/liste, pagination.
import { api } from '../core/api.js';
import { qs, qsa, getParam } from '../core/utils.js';
import { articleCard, articleRow } from '../components/cards.js';
import { revealNow } from '../animations/scroll-reveal.js';

const grid = qs('#articles-grid');
const state = {
  category: getParam('category') || '',
  type: getParam('type') || '',
  sort: getParam('sort') || 'newest',
  rating: getParam('rating') || '',
  page: parseInt(getParam('page'), 10) || 1,
  view: localStorage.getItem('tsundoku_view') || 'grid',
  limit: 9,
};

const TYPES = [['', 'Tout'], ['chronique', 'Chroniques'], ['analyse', 'Analyses'], ['dossier', 'Dossiers']];
const TITLES = { '': 'Chroniques', chronique: 'Chroniques', analyse: 'Analyses', dossier: 'Dossiers', journal: 'Journal' };

function renderTypeTabs() {
  const host = qs('#type-tabs');
  host.innerHTML = TYPES.map(([v, l]) => `<button class="type-tab ${state.type === v ? 'is-active' : ''}" data-type="${v}">${l}</button>`).join('');
  host.addEventListener('click', (e) => {
    const b = e.target.closest('[data-type]'); if (!b) return;
    state.type = b.dataset.type; state.page = 1;
    qsa('#type-tabs .type-tab').forEach((t) => t.classList.toggle('is-active', t === b));
    qs('#page-title').textContent = TITLES[state.type] || 'Chroniques';
    load();
  });
}

function syncURL() {
  const p = new URLSearchParams();
  if (state.category) p.set('category', state.category);
  if (state.type) p.set('type', state.type);
  if (state.rating) p.set('rating', state.rating);
  if (state.sort !== 'newest') p.set('sort', state.sort);
  if (state.page > 1) p.set('page', state.page);
  history.replaceState(null, '', `${location.pathname}${p.toString() ? '?' + p : ''}`);
}

async function loadCategories() {
  try {
    const { categories } = await api.get('/categories');
    const host = qs('#cat-filters');
    host.innerHTML = `<button class="chip ${!state.category ? 'is-active' : ''}" data-cat="">Toutes</button>` +
      categories.filter((c) => c.posts_count > 0).map((c) =>
        `<button class="chip ${state.category === c.slug ? 'is-active' : ''}" data-cat="${c.slug}">${c.name}</button>`).join('');
    host.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-cat]');
      if (!btn) return;
      state.category = btn.dataset.cat; state.page = 1;
      qsa('#cat-filters .chip').forEach((c) => c.classList.toggle('is-active', c === btn));
      load();
    });
  } catch { /* silencieux */ }
}

async function load() {
  grid.innerHTML = '<div class="spinner"></div>';
  syncURL();
  try {
    const data = await api.get(`/posts?page=${state.page}&limit=${state.limit}&sort=${state.sort}${state.category ? '&category=' + state.category : ''}${state.type ? '&type=' + state.type : ''}${state.rating ? '&rating_min=' + state.rating : ''}`);
    qs('#articles-count').textContent = `${data.total} chronique${data.total > 1 ? 's' : ''} publiée${data.total > 1 ? 's' : ''}.`;

    if (!data.posts.length) {
      grid.className = '';
      grid.innerHTML = `<div class="empty"><h3>Aucune chronique</h3><p>Aucune chronique dans cette catégorie pour le moment.</p></div>`;
      qs('#pagination').innerHTML = '';
      return;
    }

    if (state.view === 'list') {
      grid.className = 'stack-list';
      grid.innerHTML = data.posts.map(articleRow).join('');
    } else {
      grid.className = 'grid-cards';
      grid.innerHTML = data.posts.map((p) => articleCard(p, 'md')).join('');
    }
    revealNow(grid);
    renderPagination(data);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  } catch (err) {
    grid.className = '';
    grid.innerHTML = `<div class="empty"><h3>Erreur de chargement</h3><p>${err.message}</p></div>`;
  }
}

function renderPagination(data) {
  const host = qs('#pagination');
  if (data.pages <= 1) { host.innerHTML = ''; return; }
  let html = '<div class="pagination">';
  html += `<button ${data.page === 1 ? 'disabled' : ''} data-page="${data.page - 1}">←</button>`;
  for (let i = 1; i <= data.pages; i++) {
    html += `<button class="${i === data.page ? 'is-active' : ''}" data-page="${i}">${i}</button>`;
  }
  html += `<button ${data.page === data.pages ? 'disabled' : ''} data-page="${data.page + 1}">→</button>`;
  html += '</div>';
  host.innerHTML = html;
  host.querySelectorAll('[data-page]').forEach((b) => b.addEventListener('click', () => {
    state.page = parseInt(b.dataset.page, 10); load();
  }));
}

function initControls() {
  const sort = qs('#sort-select');
  sort.value = state.sort;
  sort.addEventListener('change', () => { state.sort = sort.value; state.page = 1; load(); });

  const rating = qs('#rating-select');
  if (rating) { rating.value = state.rating; rating.addEventListener('change', () => { state.rating = rating.value; state.page = 1; load(); }); }

  qsa('.view-toggle__btn').forEach((btn) => {
    btn.classList.toggle('is-active', btn.dataset.view === state.view);
    btn.addEventListener('click', () => {
      state.view = btn.dataset.view;
      localStorage.setItem('tsundoku_view', state.view);
      qsa('.view-toggle__btn').forEach((b) => b.classList.toggle('is-active', b === btn));
      load();
    });
  });
}

renderTypeTabs();
if (state.type) qs('#page-title').textContent = TITLES[state.type] || 'Chroniques';
loadCategories();
initControls();
load();
