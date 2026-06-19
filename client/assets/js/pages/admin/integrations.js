// Intégrations (§22) : recherche & synchronisation Anilist.
import { api } from '../../core/api.js';
import { qs, escapeHtml } from '../../core/utils.js';
import { toast } from '../../core/toast.js';
import { requireAdmin, renderSidebar } from './admin-shell.js';

async function search() {
  const q = qs('#ani-q').value.trim(); if (!q) return;
  const host = qs('#ani-res'); host.innerHTML = '<div class="spinner"></div>';
  try {
    const { results } = await api.auth.get(`/integration/anilist/search?q=${encodeURIComponent(q)}`);
    if (!results.length) { host.innerHTML = '<p class="text-muted">Aucun résultat.</p>'; return; }
    host.innerHTML = results.map((r) => `<figure style="margin:0">
      <img src="${escapeHtml(r.cover_image_url || '')}" style="width:100%;aspect-ratio:2/3;object-fit:cover;border-radius:4px" alt="">
      <figcaption style="font-size:.72rem;margin-top:4px">${escapeHtml(r.title)}</figcaption>
    </figure>`).join('');
  } catch (e) { host.innerHTML = `<p class="text-muted">${e.message}</p>`; }
}

async function main() {
  const user = await requireAdmin(); if (!user) return;
  renderSidebar('/admin/integrations.html', user);
  qs('#ani-go').addEventListener('click', search);
  qs('#ani-q').addEventListener('keydown', (e) => { if (e.key === 'Enter') search(); });
  qs('#ani-sync').addEventListener('click', async () => {
    try { const r = await api.auth.post('/integration/anilist/sync'); toast(r.message || 'Synchronisation lancée', { type: 'success' }); }
    catch (e) { toast(e.message, { type: 'error' }); }
  });
}

main();
