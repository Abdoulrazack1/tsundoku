// Journal de lecture (§5.7) : timeline chronologique, filtres par statut.
import { api } from '../core/api.js';
import { qs, qsa, escapeHtml, coverFallback, statusLabel, formatDate } from '../core/utils.js';
import { revealNow } from '../animations/scroll-reveal.js';

const tl = qs('#timeline');
let state = { status: '' };

const STATUSES = [['', 'Tout'], ['lu', 'Lu'], ['en_cours', 'En cours'], ['relu', 'Relu'], ['abandonne', 'Abandonné']];

function entry(e) {
  const b = e.book;
  const date = e.end_date || e.start_date || e.created_at;
  return `<div class="tl-entry reveal">
    <div class="tl-card">
      <a href="/book.html?slug=${b.slug}"><img src="${coverFallback(b.cover_image_url, b.title)}" alt="" loading="lazy"></a>
      <div>
        <div class="tl-date">${formatDate(date, { day: 'numeric', month: 'long', year: 'numeric' })}</div>
        <a href="/book.html?slug=${b.slug}"><h3 style="font-family:var(--font-display);font-size:1.3rem;line-height:1.2;margin-block:4px">${escapeHtml(b.title)}</h3></a>
        <div class="cluster" style="gap:12px">
          <span class="status-dot" data-status="${e.status}">${statusLabel(e.status)}</span>
          ${b.author ? `<span class="text-muted" style="font-size:.85rem">${escapeHtml(b.author.name)}</span>` : ''}
        </div>
        ${e.status === 'en_cours' && e.progress != null ? `<div class="progress" style="margin-top:10px;max-width:280px"><div class="progress__fill" style="width:${e.progress}%"></div></div><span class="text-muted" style="font-size:.75rem">${e.progress}%</span>` : ''}
        ${e.notes ? `<p class="text-muted" style="margin-top:8px;font-family:var(--font-serif);font-style:italic">« ${escapeHtml(e.notes)} »</p>` : ''}
      </div>
    </div>
  </div>`;
}

function renderFilters() {
  const host = qs('#journal-filters');
  host.innerHTML = STATUSES.map(([v, l]) => `<button class="chip ${state.status === v ? 'is-active' : ''}" data-st="${v}">${l}</button>`).join('');
  host.addEventListener('click', (e) => {
    const b = e.target.closest('[data-st]'); if (!b) return;
    state.status = b.dataset.st;
    qsa('#journal-filters .chip').forEach((c) => c.classList.toggle('is-active', c === b));
    load();
  });
}

async function load() {
  tl.innerHTML = '<div class="spinner"></div>';
  try {
    const { entries } = await api.get(`/timeline${state.status ? '?status=' + state.status : ''}`);
    if (!entries.length) {
      tl.innerHTML = `<div class="empty"><h3>Journal vide</h3><p>Votre journal de lecture est vide. Enregistrez vos lectures pour suivre votre progression.</p></div>`;
      return;
    }
    tl.innerHTML = entries.map(entry).join('');
    revealNow(tl);
  } catch (err) {
    tl.innerHTML = `<div class="empty"><h3>Erreur</h3><p>${err.message}</p></div>`;
  }
}

renderFilters();
load();
