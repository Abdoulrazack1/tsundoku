// Gestion des articles (§6.4) : table filtrable + actions (éditer, statut, supprimer).
import { api } from '../../core/api.js';
import { qs, qsa, escapeHtml, formatDate } from '../../core/utils.js';
import { toast } from '../../core/toast.js';
import { requireAdmin, renderSidebar } from './admin-shell.js';

let status = 'all';
const FILTERS = [['all', 'Tous'], ['published', 'Publiés'], ['draft', 'Brouillons'], ['archived', 'Archivés']];

function renderFilters() {
  qs('#status-filter').innerHTML = FILTERS.map(([v, l]) => `<button class="chip ${status === v ? 'is-active' : ''}" data-st="${v}">${l}</button>`).join('');
  qs('#status-filter').onclick = (e) => {
    const b = e.target.closest('[data-st]'); if (!b) return;
    status = b.dataset.st;
    qsa('#status-filter .chip').forEach((c) => c.classList.toggle('is-active', c === b));
    load();
  };
}

async function load() {
  const host = qs('#table');
  host.innerHTML = '<div class="spinner"></div>';
  try {
    const { posts } = await api.auth.get(`/posts?status=${status}&limit=100&sort=newest`);
    if (!posts.length) { host.innerHTML = '<p class="text-muted">Aucun article.</p>'; return; }
    host.innerHTML = `<table class="admin-table"><thead><tr>
      <th>Titre</th><th>Livre lié</th><th>Statut</th><th>Date</th><th>Vues</th><th></th></tr></thead><tbody>
      ${posts.map((p) => `<tr data-id="${p.id}">
        <td style="font-family:var(--font-display)">${escapeHtml(p.title)}</td>
        <td>${escapeHtml(p.book?.title || '—')}</td>
        <td><span class="status-badge ${p.status}">${p.status}</span></td>
        <td>${p.published_at ? formatDate(p.published_at, { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}</td>
        <td>${p.views_count}</td>
        <td><div class="row-actions">
          <button data-act="edit">Éditer</button>
          <button data-act="toggle">${p.status === 'published' ? 'Dépublier' : 'Publier'}</button>
          <button data-act="del">Suppr.</button>
        </div></td>
      </tr>`).join('')}
    </tbody></table>`;
    host.onclick = onAction;
  } catch (e) { host.innerHTML = `<p class="text-muted">${e.message}</p>`; }
}

async function onAction(e) {
  const btn = e.target.closest('[data-act]'); if (!btn) return;
  const tr = btn.closest('tr'); const id = tr.dataset.id;
  const act = btn.dataset.act;
  if (act === 'edit') { location.href = `/admin/post-editor.html?id=${id}`; return; }
  if (act === 'del') {
    if (!confirm('Supprimer cet article ?')) return;
    try { await api.auth.del(`/posts/${id}`); tr.remove(); toast('Supprimé', { type: 'success' }); } catch (err) { toast(err.message, { type: 'error' }); }
  }
  if (act === 'toggle') {
    const newStatus = btn.textContent === 'Publier' ? 'published' : 'draft';
    try { await api.auth.patch(`/posts/${id}/status`, { status: newStatus }); toast('Statut mis à jour', { type: 'success' }); load(); } catch (err) { toast(err.message, { type: 'error' }); }
  }
}

async function main() {
  const user = await requireAdmin(); if (!user) return;
  renderSidebar('/admin/articles.html', user);
  renderFilters();
  load();
}

main();
