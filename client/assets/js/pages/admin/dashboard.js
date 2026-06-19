// Dashboard admin (§6.2) : KPIs, graphique des vues, tableau des articles.
import { api } from '../../core/api.js';
import { qs, escapeHtml, formatDate } from '../../core/utils.js';
import { toast } from '../../core/toast.js';
import { requireAdmin, renderSidebar } from './admin-shell.js';

async function main() {
  const user = await requireAdmin();
  if (!user) return;
  renderSidebar('/admin/dashboard.html', user);

  // KPIs + stats
  try {
    const s = await api.auth.get('/stats/admin');
    const t = s.totals || {};
    qs('#kpis').innerHTML = [
      [t.published_posts, 'Articles publiés'],
      [t.draft_posts, 'Brouillons'],
      [t.views, 'Vues totales'],
      [t.subscribers, 'Abonnés'],
      [t.books, 'Livres / mangas'],
    ].map(([n, l]) => `<div class="kpi"><div class="kpi__num">${n ?? 0}</div><div class="kpi__label">${l}</div></div>`).join('');

    if (window.Chart) {
      const days = s.viewsByDay || [];
      Chart.defaults.font.family = "'Space Grotesk', sans-serif";
      Chart.defaults.color = '#8c8c8c';
      new Chart(qs('#views-chart'), {
        type: 'line',
        data: { labels: days.map((d) => formatDate(d.day, { day: '2-digit', month: '2-digit' })), datasets: [{ data: days.map((d) => d.count), borderColor: '#c0392b', backgroundColor: 'rgba(192,57,43,0.08)', fill: true, tension: 0.35 }] },
        options: { plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, ticks: { precision: 0 } }, x: { grid: { display: false } } } },
      });
    }
  } catch (e) { qs('#kpis').innerHTML = `<p class="text-muted">Stats indisponibles : ${e.message}</p>`; }

  loadTable();
}

async function loadTable() {
  const host = qs('#posts-table');
  try {
    const { posts } = await api.auth.get('/posts?status=all&limit=20&sort=newest');
    if (!posts.length) {
      host.innerHTML = `<div class="empty"><h3>Aucun article</h3><p>Bienvenue ! Commencez par créer votre premier article.</p><a class="btn" href="/admin/post-editor.html">Créer un article</a></div>`;
      return;
    }
    host.innerHTML = `<table class="admin-table"><thead><tr>
      <th>Titre</th><th>Catégorie</th><th>Statut</th><th>Date</th><th>Vues</th><th></th>
    </tr></thead><tbody>
      ${posts.map((p) => `<tr data-id="${p.id}" data-slug="${p.slug}">
        <td style="font-family:var(--font-display);font-size:1rem">${escapeHtml(p.title)}</td>
        <td>${p.categories?.[0]?.name || '—'}</td>
        <td><span class="status-badge ${p.status}">${p.status}</span></td>
        <td>${p.published_at ? formatDate(p.published_at, { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}</td>
        <td>${p.views_count}</td>
        <td><div class="row-actions">
          <button data-act="edit" title="Éditer">Éditer</button>
          <button data-act="del" title="Supprimer">Suppr.</button>
        </div></td>
      </tr>`).join('')}
    </tbody></table>`;

    host.addEventListener('click', async (e) => {
      const btn = e.target.closest('[data-act]'); if (!btn) return;
      const tr = btn.closest('tr');
      const id = tr.dataset.id;
      if (btn.dataset.act === 'edit') { location.href = `/admin/post-editor.html?id=${id}`; }
      if (btn.dataset.act === 'del') {
        if (!confirm('Supprimer cet article définitivement ?')) return;
        try { await api.auth.del(`/posts/${id}`); tr.remove(); toast('Article supprimé', { type: 'success' }); }
        catch (err) { toast(err.message, { type: 'error' }); }
      }
    });
  } catch (e) { host.innerHTML = `<p class="text-muted">${e.message}</p>`; }
}

main();
