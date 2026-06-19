// Éditeur d'articles (§6.3) : Editor.js, upload/Anilist de couverture, liaison livre.
import { api } from '../../core/api.js';
import { qs, qsa, escapeHtml, getParam, coverFallback } from '../../core/utils.js';
import { toast } from '../../core/toast.js';
import { requireAdmin, renderSidebar } from './admin-shell.js';

const postId = getParam('id');
let editor = null;
let coverUrl = '';

/* ---- Sérialisation Editor.js <-> HTML ---- */
function blocksToHtml(data) {
  return (data.blocks || []).map((b) => {
    const d = b.data || {};
    switch (b.type) {
      case 'header': return `<h${d.level <= 2 ? 2 : 3}>${d.text || ''}</h${d.level <= 2 ? 2 : 3}>`;
      case 'paragraph': return `<p>${d.text || ''}</p>`;
      case 'list': {
        const tag = d.style === 'ordered' ? 'ol' : 'ul';
        const items = (d.items || []).map((i) => `<li>${typeof i === 'string' ? i : (i.content || '')}</li>`).join('');
        return `<${tag}>${items}</${tag}>`;
      }
      case 'quote': return `<blockquote>${d.text || ''}${d.caption ? `<cite>${d.caption}</cite>` : ''}</blockquote>`;
      case 'delimiter': return '<hr>';
      default: return d.text ? `<p>${d.text}</p>` : '';
    }
  }).join('\n');
}

function htmlToBlocks(html) {
  const doc = new DOMParser().parseFromString(`<div id="r">${html || ''}</div>`, 'text/html');
  const blocks = [];
  doc.getElementById('r').childNodes.forEach((node) => {
    if (node.nodeType !== 1) return;
    const tag = node.tagName.toLowerCase();
    if (tag === 'h2' || tag === 'h3') blocks.push({ type: 'header', data: { text: node.innerHTML, level: tag === 'h2' ? 2 : 3 } });
    else if (tag === 'ul' || tag === 'ol') blocks.push({ type: 'list', data: { style: tag === 'ol' ? 'ordered' : 'unordered', items: [...node.children].map((li) => li.innerHTML) } });
    else if (tag === 'blockquote') blocks.push({ type: 'quote', data: { text: node.querySelector('cite') ? node.childNodes[0]?.textContent || node.innerHTML : node.innerHTML, caption: node.querySelector('cite')?.textContent || '' } });
    else if (tag === 'hr') blocks.push({ type: 'delimiter', data: {} });
    else blocks.push({ type: 'paragraph', data: { text: node.innerHTML } });
  });
  return blocks.length ? blocks : [{ type: 'paragraph', data: { text: '' } }];
}

function initEditor(blocks) {
  editor = new window.EditorJS({
    holder: 'editorjs',
    placeholder: 'Écrivez votre chronique…',
    tools: {
      header: { class: window.Header, config: { levels: [2, 3], defaultLevel: 2 } },
      list: { class: window.List || window.EditorjsList, inlineToolbar: true },
      quote: { class: window.Quote, inlineToolbar: true },
      delimiter: window.Delimiter,
    },
    data: { blocks: blocks || [{ type: 'paragraph', data: { text: '' } }] },
  });
}

function setCover(url) {
  coverUrl = url || '';
  const img = qs('#cover-preview');
  if (coverUrl) { img.src = coverFallback(coverUrl); img.style.display = 'block'; }
  else img.style.display = 'none';
}

async function loadTaxonomies(selectedCats = []) {
  const { categories } = await api.get('/categories');
  qs('#cat-checks').innerHTML = categories.map((c) =>
    `<label><input type="checkbox" value="${c.id}" ${selectedCats.includes(c.id) ? 'checked' : ''}> ${escapeHtml(c.name)}</label>`).join('');
  const { books } = await api.get('/books?limit=100');
  qs('#book-select').innerHTML = '<option value="">— Aucun —</option>' +
    books.map((b) => `<option value="${b.id}">${escapeHtml(b.title)}${b.author ? ' — ' + escapeHtml(b.author.name) : ''}</option>`).join('');
}

function initCoverControls() {
  qs('#cover-file').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const fd = new FormData(); fd.append('image', file);
    try { const { url } = await api.auth.post('/media/upload', fd); setCover(url); toast('Couverture téléversée', { type: 'success' }); }
    catch (err) { toast(err.message, { type: 'error' }); }
  });

  qs('#anilist-search').addEventListener('click', async (e) => {
    e.preventDefault();
    const q = qs('#anilist-q').value.trim();
    if (!q) return;
    const host = qs('#anilist-results');
    host.innerHTML = '<div class="spinner"></div>';
    try {
      const { results } = await api.auth.get(`/integration/anilist/search?q=${encodeURIComponent(q)}`);
      if (!results.length) { host.innerHTML = '<p class="text-muted">Aucun résultat.</p>'; return; }
      host.innerHTML = results.map((r) => `<button class="anilist-hit" data-cover="${escapeHtml(r.cover_image_url || '')}" style="display:flex;gap:8px;align-items:center;text-align:left;padding:6px;border:1px solid var(--line);border-radius:6px">
        <img src="${escapeHtml(r.cover_image_url || '')}" style="width:36px;height:52px;object-fit:cover;border-radius:3px" alt="">
        <span style="font-size:.8rem">${escapeHtml(r.title)}${r.publication_year ? ` (${r.publication_year})` : ''}</span>
      </button>`).join('');
      host.querySelectorAll('.anilist-hit').forEach((b) => b.addEventListener('click', () => {
        setCover(b.dataset.cover); toast('Couverture Anilist sélectionnée', { type: 'success' });
      }));
    } catch (err) { host.innerHTML = `<p class="text-muted">${err.message}</p>`; }
  });
}

async function loadExisting() {
  if (!postId) { initEditor(); return; }
  try {
    const { post } = await api.auth.get(`/posts/id/${postId}`);
    qs('#editor-heading').textContent = 'Modifier l\'article';
    qs('#post-title').value = post.title || '';
    qs('#post-excerpt').value = post.excerpt || '';
    qs('#post-tags').value = (post.tags || []).map((t) => t.name).join(', ');
    qs('#meta-title').value = post.meta_title || '';
    qs('#meta-desc').value = post.meta_description || '';
    qs('#featured').checked = !!post.featured;
    qsa(`input[name="status"]`).forEach((r) => { r.checked = r.value === post.status; });
    setCover(post.cover_image_url);
    if (post.book?.id) qs('#book-select').value = post.book.id;
    qsa('#cat-checks input').forEach((c) => { c.checked = (post.categories || []).some((cat) => cat.id === Number(c.value)); });
    qs('#delete-btn').style.display = 'block';
    initEditor(htmlToBlocks(post.content));
  } catch (e) { toast('Chargement impossible : ' + e.message, { type: 'error' }); initEditor(); }
}

async function save() {
  const msg = qs('#editor-msg'); msg.textContent = '';
  const title = qs('#post-title').value.trim();
  if (!title) { msg.textContent = 'Le titre est requis.'; return; }
  const out = await editor.save();
  const content = blocksToHtml(out);
  if (!content.trim()) { msg.textContent = 'Le contenu est vide.'; return; }

  const payload = {
    title,
    content,
    excerpt: qs('#post-excerpt').value.trim(),
    cover_image_url: coverUrl || null,
    book_id: qs('#book-select').value ? Number(qs('#book-select').value) : null,
    status: qs('input[name="status"]:checked').value,
    featured: qs('#featured').checked,
    meta_title: qs('#meta-title').value.trim(),
    meta_description: qs('#meta-desc').value.trim(),
    category_ids: qsa('#cat-checks input:checked').map((c) => Number(c.value)),
    tags: qs('#post-tags').value.split(',').map((t) => t.trim()).filter(Boolean),
  };

  const btn = qs('#save-btn'); btn.disabled = true;
  try {
    if (postId) { await api.auth.put(`/posts/${postId}`, payload); toast('Article mis à jour', { type: 'success' }); }
    else {
      const { post } = await api.auth.post('/posts', payload);
      toast('Article créé', { type: 'success' });
      location.href = `/admin/post-editor.html?id=${post.id}`;
    }
  } catch (err) { msg.textContent = err.message; }
  finally { btn.disabled = false; }
}

async function main() {
  const user = await requireAdmin();
  if (!user) return;
  renderSidebar('/admin/post-editor.html', user);
  initCoverControls();
  await loadTaxonomies();
  await loadExisting();

  qs('#save-btn').addEventListener('click', save);
  qs('#delete-btn').addEventListener('click', async () => {
    if (!confirm('Supprimer cet article ?')) return;
    try { await api.auth.del(`/posts/${postId}`); location.href = '/admin/dashboard.html'; }
    catch (err) { toast(err.message, { type: 'error' }); }
  });
}

main();
