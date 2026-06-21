// Page API (admin) : sidebar + testeur d'endpoints en direct.
import { qs } from '../../core/utils.js';
import { requireAdmin, renderSidebar } from './admin-shell.js';

async function main() {
  const user = await requireAdmin(); if (!user) return;
  renderSidebar('/admin/api.html', user);
  const out = qs('#api-out');
  qs('#api-run').addEventListener('click', async () => {
    const p = qs('#api-path').value.trim();
    out.textContent = 'Chargement…';
    try { const r = await fetch(p); out.textContent = JSON.stringify(await r.json(), null, 2); }
    catch (e) { out.textContent = 'Erreur : ' + e.message; }
  });
}

main();
