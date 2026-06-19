// Gestion des livres (§6.5) : liste, ajout (Anilist / upload), suppression.
import { api } from '../../core/api.js';
import { qs, escapeHtml } from '../../core/utils.js';
import { toast } from '../../core/toast.js';
import { requireAdmin, renderSidebar } from './admin-shell.js';

let coverUrl = '';
let authors = [];

async function loadAuthors() {
  const res = await api.get('/authors');
  authors = res.authors || [];
  qs('#authors-list').innerHTML = authors.map((a) => `<option value="${escapeHtml(a.name)}">`).join('');
}

async function loadBooks() {
  const host = qs('#books-table');
  try {
    const { books } = await api.get('/books?limit=100');
    if (!books.length) { host.innerHTML = '<p class="text-muted">Aucun livre.</p>'; return; }
    host.innerHTML = `<table class="admin-table"><thead><tr><th>Titre</th><th>Auteur</th><th>Statut</th><th>Source</th><th></th></tr></thead><tbody>
      ${books.map((b) => `<tr data-id="${b.id}">
        <td style="font-family:var(--font-display)">${escapeHtml(b.title)}</td>
        <td>${escapeHtml(b.author?.name || '—')}</td>
        <td>${b.status}</td><td>${b.source}</td>
        <td><div class="row-actions"><button data-act="del">Suppr.</button></div></td>
      </tr>`).join('')}
    </tbody></table>`;
    host.onclick = async (e) => {
      const btn = e.target.closest('[data-act="del"]'); if (!btn) return;
      const tr = btn.closest('tr');
      if (!confirm('Supprimer ce livre ?')) return;
      try { await api.auth.del(`/books/${tr.dataset.id}`); tr.remove(); toast('Livre supprimé', { type: 'success' }); }
      catch (err) { toast(err.message, { type: 'error' }); }
    };
  } catch (e) { host.innerHTML = `<p class="text-muted">${e.message}</p>`; }
}

function setCover(url) {
  coverUrl = url || '';
  const img = qs('#b-cover-prev');
  if (coverUrl) { img.src = coverUrl; img.style.display = 'block'; } else img.style.display = 'none';
}

function initAnilist() {
  qs('#ani-go').addEventListener('click', async (e) => {
    e.preventDefault();
    const q = qs('#ani-q').value.trim(); if (!q) return;
    const host = qs('#ani-res'); host.innerHTML = '<div class="spinner"></div>';
    try {
      const { results } = await api.auth.get(`/integration/anilist/search?q=${encodeURIComponent(q)}`);
      if (!results.length) { host.innerHTML = '<p class="text-muted">Aucun résultat.</p>'; return; }
      host.innerHTML = results.map((r, i) => `<button class="ani-hit" data-i="${i}" style="display:flex;gap:8px;text-align:left;padding:6px;border:1px solid var(--line);border-radius:6px">
        <img src="${escapeHtml(r.cover_image_url || '')}" style="width:34px;height:48px;object-fit:cover;border-radius:3px" alt="">
        <span style="font-size:.78rem">${escapeHtml(r.title)}${r.publication_year ? ` (${r.publication_year})` : ''}</span></button>`).join('');
      host.querySelectorAll('.ani-hit').forEach((b) => b.addEventListener('click', () => {
        const r = results[b.dataset.i];
        qs('#b-title').value = r.title || '';
        if (r.author) qs('#b-author').value = r.author;
        if (r.publication_year) qs('#b-year').value = r.publication_year;
        if (r.pages) qs('#b-pages').value = r.pages;
        if (r.synopsis) qs('#b-synopsis').value = r.synopsis;
        setCover(r.cover_image_url);
        toast('Œuvre importée depuis Anilist', { type: 'success' });
      }));
    } catch (err) { host.innerHTML = `<p class="text-muted">${err.message}</p>`; }
  });
}

async function ensureAuthor(name) {
  const found = authors.find((a) => a.name.toLowerCase() === name.toLowerCase());
  if (found) return found.id;
  const { author } = await api.auth.post('/authors', { name });
  authors.push(author);
  return author.id;
}

async function submit(e) {
  e.preventDefault();
  const msg = qs('#book-msg'); msg.textContent = '';
  const title = qs('#b-title').value.trim();
  const authorName = qs('#b-author').value.trim();
  if (!title || !authorName) { msg.textContent = 'Titre et auteur requis.'; return; }
  const btn = e.target.querySelector('button[type="submit"]'); btn.disabled = true;
  try {
    const author_id = await ensureAuthor(authorName);
    const payload = {
      title, author_id, cover_image_url: coverUrl || null,
      publication_year: qs('#b-year').value ? Number(qs('#b-year').value) : null,
      pages: qs('#b-pages').value ? Number(qs('#b-pages').value) : null,
      publisher: qs('#b-publisher').value.trim() || null,
      status: qs('#b-status').value,
      rating: qs('#b-rating').value ? Number(qs('#b-rating').value) : null,
      synopsis: qs('#b-synopsis').value.trim() || null,
      source: coverUrl.includes('anilist') ? 'anilist' : 'tsundoku',
    };
    await api.auth.post('/books', payload);
    toast('Livre ajouté', { type: 'success' });
    e.target.reset(); setCover(''); loadBooks(); loadAuthors();
  } catch (err) { msg.textContent = err.message; }
  finally { btn.disabled = false; }
}

async function main() {
  const user = await requireAdmin(); if (!user) return;
  renderSidebar('/admin/books.html', user);
  await loadAuthors();
  await loadBooks();
  initAnilist();
  qs('#b-cover-file').addEventListener('change', async (e) => {
    const file = e.target.files[0]; if (!file) return;
    const fd = new FormData(); fd.append('image', file);
    try { const { url } = await api.auth.post('/media/upload', fd); setCover(url); }
    catch (err) { toast(err.message, { type: 'error' }); }
  });
  qs('#book-form').addEventListener('submit', submit);
}

main();
