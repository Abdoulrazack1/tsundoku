// Médiathèque admin : liste, upload (drag & drop), suppression, copie d'URL.
import { api } from '../../core/api.js';
import { qs, escapeHtml } from '../../core/utils.js';
import { toast } from '../../core/toast.js';
import { requireAdmin, renderSidebar } from './admin-shell.js';

const grid = qs('#media-grid');

function fmtSize(b) { return b > 1e6 ? `${(b / 1e6).toFixed(1)} Mo` : `${Math.round(b / 1024)} Ko`; }

async function load() {
  try {
    const { media } = await api.auth.get('/media');
    if (!media.length) { grid.innerHTML = '<p class="text-muted" style="grid-column:1/-1">Aucune image. Téléversez-en.</p>'; return; }
    grid.innerHTML = media.map((m) => `<figure class="media-item" data-file="${escapeHtml(m.filename)}">
      <img src="${m.url}" alt="${escapeHtml(m.filename)}" title="Cliquer pour copier l'URL">
      <div class="media-item__bar"><span>${fmtSize(m.size)}</span><button data-del title="Supprimer">✕</button></div>
    </figure>`).join('');
  } catch (e) { grid.innerHTML = `<p class="text-muted">${e.message}</p>`; }
}

async function uploadFiles(files) {
  for (const file of files) {
    if (!file.type.startsWith('image/')) continue;
    const fd = new FormData(); fd.append('image', file);
    try { await api.auth.post('/media/upload', fd); } catch (e) { toast(e.message, { type: 'error' }); }
  }
  toast('Téléversement terminé', { type: 'success' });
  load();
}

function initUpload() {
  const dz = qs('#dropzone');
  const input = qs('#file-input');
  dz.addEventListener('click', () => input.click());
  input.addEventListener('change', () => uploadFiles([...input.files]));
  ['dragover', 'dragenter'].forEach((ev) => dz.addEventListener(ev, (e) => { e.preventDefault(); dz.classList.add('is-over'); }));
  ['dragleave', 'drop'].forEach((ev) => dz.addEventListener(ev, () => dz.classList.remove('is-over')));
  dz.addEventListener('drop', (e) => { e.preventDefault(); uploadFiles([...e.dataTransfer.files]); });
}

grid.addEventListener('click', async (e) => {
  const fig = e.target.closest('.media-item'); if (!fig) return;
  if (e.target.closest('[data-del]')) {
    if (!confirm('Supprimer cette image ?')) return;
    try { await api.auth.del(`/media/${fig.dataset.file}`); fig.remove(); toast('Supprimée', { type: 'success' }); }
    catch (err) { toast(err.message, { type: 'error' }); }
    return;
  }
  if (e.target.tagName === 'IMG') {
    navigator.clipboard?.writeText(e.target.src);
    toast('URL copiée');
  }
});

async function main() {
  const user = await requireAdmin(); if (!user) return;
  renderSidebar('/admin/media.html', user);
  initUpload();
  load();
}

main();
