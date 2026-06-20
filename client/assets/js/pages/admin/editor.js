// Éditeur d'articles (§6.3) : Editor.js, upload/Anilist de couverture, liaison livre.
import { api } from '../../core/api.js';
import { qs, qsa, escapeHtml, getParam, coverFallback, debounce, safeHtml } from '../../core/utils.js';
import { toast } from '../../core/toast.js';
import { requireAdmin, renderSidebar } from './admin-shell.js';

const DRAFT_KEY = `tsundoku_draft_${getParam('id') || 'new'}`;

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
      case 'image': {
        const url = d.file?.url || d.url;
        if (!url) return '';
        const cap = (d.caption || '').trim();
        return `<figure class="manga-figure"><img src="${url}" alt="${cap.replace(/"/g, '')}" loading="lazy">${cap ? `<figcaption>${cap}</figcaption>` : ''}</figure>`;
      }
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
    else if (tag === 'figure' || tag === 'img') {
      const img = tag === 'img' ? node : node.querySelector('img');
      if (img) blocks.push({ type: 'image', data: { file: { url: img.getAttribute('src') }, caption: node.querySelector?.('figcaption')?.innerHTML || img.getAttribute('alt') || '' } });
    } else blocks.push({ type: 'paragraph', data: { text: node.innerHTML } });
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
      image: window.ImageTool ? {
        class: window.ImageTool,
        config: {
          captionPlaceholder: 'Légende (tome, chapitre, page…)',
          uploader: {
            async uploadByFile(file) {
              const fd = new FormData(); fd.append('image', file);
              const { url } = await api.auth.post('/media/upload', fd);
              return { success: 1, file: { url } };
            },
            async uploadByUrl(url) { return { success: 1, file: { url } }; },
          },
        },
      } : undefined,
    },
    data: { blocks: blocks || [{ type: 'paragraph', data: { text: '' } }] },
    onChange: () => { updateWordCount(); scheduleAutosave(); },
  });
}

/* ---- Compteur de mots & temps de lecture (live) ---- */
async function updateWordCount() {
  if (!editor) return;
  try {
    const out = await editor.save();
    const text = blocksToHtml(out).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    const words = text ? text.split(' ').filter(Boolean).length : 0;
    qs('#word-count').textContent = `${words} mot${words > 1 ? 's' : ''} · ${Math.max(1, Math.ceil(words / 200))} min`;
  } catch { /* ignore */ }
}

/* ---- Autosave brouillon (localStorage) ---- */
const scheduleAutosave = debounce(async () => {
  try {
    const out = await editor.save();
    const snap = { title: qs('#post-title').value, blocks: out.blocks, ts: Date.now() };
    localStorage.setItem(DRAFT_KEY, JSON.stringify(snap));
    qs('#autosave-status').textContent = `Brouillon auto-enregistré à ${new Date().toLocaleTimeString('fr-FR')}`;
  } catch { /* ignore */ }
}, 1500);

/* ---- Prévisualisation ---- */
async function preview() {
  const out = await editor.save();
  const html = safeHtml(blocksToHtml(out));
  let modal = qs('#preview-modal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'preview-modal'; modal.className = 'preview-modal';
    modal.innerHTML = '<div class="preview-modal__inner"><button class="preview-modal__close" aria-label="Fermer">✕</button><article class="prose measure" id="preview-body"></article></div>';
    document.body.append(modal);
    modal.addEventListener('click', (e) => { if (e.target === modal || e.target.closest('.preview-modal__close')) modal.classList.remove('is-open'); });
  }
  qs('#preview-body').innerHTML = `<h1 class="font-display" style="font-size:2.4rem;margin-bottom:1rem">${escapeHtml(qs('#post-title').value || 'Sans titre')}</h1>${html}`;
  modal.classList.add('is-open');
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
  if (!postId) {
    const draft = localStorage.getItem(DRAFT_KEY);
    if (draft) {
      try {
        const d = JSON.parse(draft);
        if (d.title) qs('#post-title').value = d.title;
        initEditor(d.blocks);
        qs('#autosave-status').textContent = 'Brouillon local restauré.';
        return;
      } catch { /* ignore */ }
    }
    initEditor();
    return;
  }
  try {
    const { post } = await api.auth.get(`/posts/id/${postId}`);
    qs('#editor-heading').textContent = 'Modifier l\'article';
    qs('#post-title').value = post.title || '';
    qs('#post-type').value = post.type || 'chronique';
    qs('#post-excerpt').value = post.excerpt || '';
    qs('#post-tags').value = (post.tags || []).map((t) => t.name).join(', ');
    qs('#meta-title').value = post.meta_title || '';
    qs('#meta-desc').value = post.meta_description || '';
    qs('#r-global').value = post.rating ?? '';
    qs('#r-art').value = post.rating_art ?? '';
    qs('#r-story').value = post.rating_story ?? '';
    qs('#r-chars').value = post.rating_chars ?? '';
    qs('#has-spoilers').checked = !!post.has_spoilers;
    qs('#featured').checked = !!post.featured;
    qsa(`input[name="status"]`).forEach((r) => { r.checked = r.value === post.status; });
    setCover(post.cover_image_url);
    if (post.book?.id) qs('#book-select').value = post.book.id;
    qsa('#cat-checks input').forEach((c) => { c.checked = (post.categories || []).some((cat) => cat.id === Number(c.value)); });
    qs('#delete-btn').style.display = 'block';
    initEditor(htmlToBlocks(post.content));
  } catch (e) { toast('Chargement impossible : ' + e.message, { type: 'error' }); initEditor(); }
}

/* ---- Liaison de série : recherche Anilist → import en 1 clic ---- */
function initSeriesPicker() {
  const box = qs('#series-results');
  async function doSearch() {
    const q = qs('#series-q').value.trim(); if (!q) return;
    const source = qs('#series-source').value;
    box.innerHTML = '<div class="spinner"></div>';
    try {
      const url = source === 'inko'
        ? `/integration/inko/search?q=${encodeURIComponent(q)}&source=weebcentral`
        : `/integration/anilist/search?q=${encodeURIComponent(q)}`;
      const { results } = await api.auth.get(url);
      box.innerHTML = results.map((r, i) => `<button class="series-hit" data-i="${i}" style="display:flex;gap:8px;align-items:center;text-align:left;padding:6px;border:1px solid var(--line);border-radius:6px">
        <img src="${escapeHtml(r.cover_image_url || '')}" style="width:32px;height:46px;object-fit:cover;border-radius:3px;flex:none" alt="" loading="lazy">
        <span style="font-size:.76rem">${escapeHtml(r.title)}${r.publication_year ? ` (${r.publication_year})` : ''}<br><span class="text-muted">${escapeHtml(r.author || r.source || '')}</span></span>
      </button>`).join('');
      box.querySelectorAll('.series-hit').forEach((b) => b.addEventListener('click', () => importSerie(results[b.dataset.i], source)));
    } catch (e) { box.innerHTML = `<p class="text-muted" style="font-size:.74rem">${e.message}</p>`; }
  }
  async function importSerie(r, source) {
    box.innerHTML = '<div class="spinner"></div>';
    try {
      const payload = source === 'inko'
        ? { source: 'inko', inko_id: r.inko_id, inko_source: r.source }
        : { source: 'anilist', anilist_id: r.anilist_id };
      const { book, created } = await api.auth.post('/books/import', payload);
      // ajoute/sélectionne la série dans le select
      const sel = qs('#book-select');
      let opt = [...sel.options].find((o) => o.value == book.id);
      if (!opt) { opt = new Option(`${book.title}${book.author ? ' — ' + book.author.name : ''}`, book.id); sel.add(opt); }
      sel.value = book.id;
      if (!coverUrl && book.cover_image_url) setCover(book.cover_image_url);
      box.innerHTML = `<p class="text-accent" style="font-size:.76rem">✓ ${escapeHtml(book.title)} ${created ? 'importée' : 'déjà en base'} et liée.</p>`;
      toast(created ? 'Série importée et liée' : 'Série liée', { type: 'success' });
    } catch (e) { box.innerHTML = `<p class="text-muted" style="font-size:.74rem">${e.message}</p>`; }
  }
  qs('#series-search').addEventListener('click', (e) => { e.preventDefault(); doSearch(); });
  qs('#series-q').addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); doSearch(); } });
}

/* ---- Picker de planches Inko : œuvre → chapitre → planche → insertion ---- */
function initInkoPicker() {
  const box = qs('#inko-results');
  const status = qs('#inko-status');
  const setStatus = (t) => { status.textContent = t || ''; };

  const SOURCE = 'weebcentral';
  async function doSearch() {
    const q = qs('#inko-q').value.trim(); if (!q) return;
    box.innerHTML = '<div class="spinner"></div>'; setStatus('Recherche sur Weeb Central…');
    try {
      const { results } = await api.auth.get(`/integration/inko/search?q=${encodeURIComponent(q)}&source=${SOURCE}`);
      setStatus(`${results.length} résultat(s)`);
      box.innerHTML = results.map((r, i) => `<button class="inko-pick" data-i="${i}" style="display:flex;gap:8px;align-items:center;text-align:left;padding:6px;border:1px solid var(--line);border-radius:6px">
        <img src="${escapeHtml(r.cover_image_url || '')}" style="width:32px;height:46px;object-fit:cover;border-radius:3px;flex:none" alt="" loading="lazy">
        <span style="font-size:.74rem;line-height:1.2">${escapeHtml(r.title)}<br><span class="text-muted">${escapeHtml(r.source || '')}</span></span>
      </button>`).join('');
      box.querySelectorAll('.inko-pick').forEach((b) => b.addEventListener('click', () => openChapters(results[b.dataset.i])));
    } catch (e) { setStatus(''); box.innerHTML = `<p class="text-muted" style="font-size:.74rem">${e.message}</p>`; }
  }

  async function openChapters(serie) {
    box.innerHTML = '<div class="spinner"></div>'; setStatus(`Chapitres — ${serie.title}`);
    try {
      const { chapters } = await api.auth.get(`/integration/inko/manga/${encodeURIComponent(serie.inko_id)}/chapters?source=${encodeURIComponent(serie.source || '')}`);
      box.innerHTML = `<button class="btn btn--sm inko-back">← Résultats</button>` +
        chapters.slice(0, 60).map((c, i) => `<button class="inko-chap" data-i="${i}" style="text-align:left;padding:6px 8px;border:1px solid var(--line);border-radius:6px;font-size:.74rem">Ch. ${escapeHtml(String(c.chapter ?? '?'))}${c.title ? ' — ' + escapeHtml(c.title) : ''}</button>`).join('');
      box.querySelector('.inko-back').addEventListener('click', doSearch);
      box.querySelectorAll('.inko-chap').forEach((b) => b.addEventListener('click', () => openPages(serie, chapters[b.dataset.i])));
    } catch (e) { setStatus(''); box.innerHTML = `<p class="text-muted" style="font-size:.74rem">${e.message}</p>`; }
  }

  async function openPages(serie, chap) {
    box.innerHTML = '<div class="spinner"></div>'; setStatus('Chargement des planches…');
    try {
      const { pages } = await api.auth.get(`/integration/inko/chapter/${encodeURIComponent(chap.id)}/pages?source=${encodeURIComponent(serie.source || '')}`);
      setStatus(`${pages.length} planches — clique pour insérer`);
      box.innerHTML = `<button class="btn btn--sm inko-back2">← Chapitres</button>
        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:6px;margin-top:6px">
        ${pages.map((p) => `<button class="inko-page" data-url="${escapeHtml(p.url)}" data-cap="${escapeHtml(serie.title)} — Ch. ${escapeHtml(String(chap.chapter ?? ''))}, p.${p.page}" title="Insérer">
          <img src="${escapeHtml(p.url)}" style="width:100%;border-radius:3px" alt="" loading="lazy"></button>`).join('')}
        </div>`;
      box.querySelector('.inko-back2').addEventListener('click', () => openChapters(serie));
      box.querySelectorAll('.inko-page').forEach((b) => b.addEventListener('click', async () => {
        try {
          // On passe par le proxy same-origin (planches souvent hotlink-protégées)
          const url = `/api/media/proxy?u=${encodeURIComponent(b.dataset.url)}`;
          await editor.blocks.insert('image', { file: { url }, caption: b.dataset.cap });
          toast('Planche insérée dans l\'article', { type: 'success' });
        } catch { toast('Insertion impossible', { type: 'error' }); }
      }));
    } catch (e) { setStatus(''); box.innerHTML = `<p class="text-muted" style="font-size:.74rem">${e.message}</p>`; }
  }

  qs('#inko-search').addEventListener('click', (e) => { e.preventDefault(); doSearch(); });
  qs('#inko-q').addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); doSearch(); } });
}

async function save() {
  const msg = qs('#editor-msg'); msg.textContent = '';
  const title = qs('#post-title').value.trim();
  if (!title) { msg.textContent = 'Le titre est requis.'; return; }
  const out = await editor.save();
  const content = blocksToHtml(out);
  if (!content.trim()) { msg.textContent = 'Le contenu est vide.'; return; }

  const num = (sel) => (qs(sel).value !== '' ? Number(qs(sel).value) : null);
  const payload = {
    title,
    type: qs('#post-type').value,
    content,
    excerpt: qs('#post-excerpt').value.trim(),
    cover_image_url: coverUrl || null,
    book_id: qs('#book-select').value ? Number(qs('#book-select').value) : null,
    rating: num('#r-global'),
    rating_art: num('#r-art'),
    rating_story: num('#r-story'),
    rating_chars: num('#r-chars'),
    has_spoilers: qs('#has-spoilers').checked,
    status: qs('input[name="status"]:checked').value,
    featured: qs('#featured').checked,
    meta_title: qs('#meta-title').value.trim(),
    meta_description: qs('#meta-desc').value.trim(),
    category_ids: qsa('#cat-checks input:checked').map((c) => Number(c.value)),
    tags: qs('#post-tags').value.split(',').map((t) => t.trim()).filter(Boolean),
  };

  const btn = qs('#save-btn'); btn.disabled = true;
  try {
    if (postId) { await api.auth.put(`/posts/${postId}`, payload); localStorage.removeItem(DRAFT_KEY); toast('Article mis à jour', { type: 'success' }); }
    else {
      const { post } = await api.auth.post('/posts', payload);
      localStorage.removeItem(DRAFT_KEY);
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
  initSeriesPicker();
  initInkoPicker();
  qs('#preview-btn').addEventListener('click', preview);
  setTimeout(updateWordCount, 400);

  qs('#save-btn').addEventListener('click', save);
  qs('#delete-btn').addEventListener('click', async () => {
    if (!confirm('Supprimer cet article ?')) return;
    try { await api.auth.del(`/posts/${postId}`); location.href = '/admin/dashboard.html'; }
    catch (err) { toast(err.message, { type: 'error' }); }
  });
}

main();
