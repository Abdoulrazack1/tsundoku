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
  loadComments();
  loadContact();
}

async function loadComments() {
  const host = qs('#comments-mod');
  try {
    const { comments } = await api.auth.get('/comments?status=pending');
    qs('#cmt-count').textContent = comments.length || '0';
    if (!comments.length) { host.innerHTML = '<p class="text-muted">Aucun commentaire en attente.</p>'; return; }
    host.innerHTML = `<table class="admin-table"><thead><tr><th>Auteur</th><th>Commentaire</th><th>Article</th><th></th></tr></thead><tbody>
      ${comments.map((c) => `<tr data-id="${c.id}">
        <td>${escapeHtml(c.author_name)}</td>
        <td style="max-width:340px">${escapeHtml(c.content)}</td>
        <td><a href="/article.html?slug=${c.post_slug}" target="_blank">${escapeHtml((c.post_title || '').slice(0, 30))}</a></td>
        <td><div class="row-actions"><button data-act="approve">Approuver</button><button data-act="del">Suppr.</button></div></td>
      </tr>`).join('')}
    </tbody></table>`;
    host.onclick = async (e) => {
      const btn = e.target.closest('[data-act]'); if (!btn) return;
      const tr = btn.closest('tr'); const id = tr.dataset.id;
      try {
        if (btn.dataset.act === 'approve') { await api.auth.patch(`/comments/${id}/approve`); toast('Commentaire approuvé', { type: 'success' }); }
        else { await api.auth.del(`/comments/${id}`); toast('Supprimé', { type: 'success' }); }
        tr.remove(); const n = qs('#comments-mod tbody')?.children.length || 0; qs('#cmt-count').textContent = n;
      } catch (err) { toast(err.message, { type: 'error' }); }
    };
  } catch (e) { host.innerHTML = `<p class="text-muted">${e.message}</p>`; }
}

async function loadContact() {
  const host = qs('#contact-mod');
  try {
    const { messages } = await api.auth.get('/contact');
    const unread = messages.filter((m) => !m.is_read).length;
    qs('#msg-count').textContent = unread || '0';
    if (!messages.length) { host.innerHTML = '<p class="text-muted">Aucun message.</p>'; return; }
    host.innerHTML = `<table class="admin-table"><thead><tr><th>De</th><th>Sujet</th><th>Message</th><th></th></tr></thead><tbody>
      ${messages.map((m) => `<tr data-id="${m.id}" style="${m.is_read ? 'opacity:.6' : ''}">
        <td>${escapeHtml(m.name)}<br><a href="mailto:${escapeHtml(m.email)}" class="text-muted" style="font-size:.78rem">${escapeHtml(m.email)}</a></td>
        <td>${escapeHtml(m.subject || '—')}</td>
        <td style="max-width:340px">${escapeHtml(m.message)}</td>
        <td><div class="row-actions"><button data-act="read">Lu</button><button data-act="del">Suppr.</button></div></td>
      </tr>`).join('')}
    </tbody></table>`;
    host.onclick = async (e) => {
      const btn = e.target.closest('[data-act]'); if (!btn) return;
      const tr = btn.closest('tr'); const id = tr.dataset.id;
      try {
        if (btn.dataset.act === 'read') { await api.auth.patch(`/contact/${id}/read`); tr.style.opacity = '.6'; }
        else { await api.auth.del(`/contact/${id}`); tr.remove(); toast('Supprimé', { type: 'success' }); }
      } catch (err) { toast(err.message, { type: 'error' }); }
    };
  } catch (e) { host.innerHTML = `<p class="text-muted">${e.message}</p>`; }
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
