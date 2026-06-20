// Overlay de recherche universelle (§5.4 / §7.H)
import { qs, el, debounce, escapeHtml, coverFallback } from '../core/utils.js';
import { api } from '../core/api.js';

export function initSearch() {
  const trigger = qs('.js-search-open');
  if (!trigger) return;

  const overlay = el('div', { class: 'search-overlay', role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Recherche' },
    el('button', { class: 'icon-btn search-overlay__close js-search-close', 'aria-label': 'Fermer' , html: closeIcon() }),
    el('div', { class: 'content', style: 'max-width:900px;width:100%' },
      el('input', { class: 'search-overlay__input', type: 'search', placeholder: 'Chercher un titre, un auteur, un genre…', 'aria-label': 'Terme de recherche' }),
      el('div', { class: 'search-overlay__results' })
    )
  );
  document.body.append(overlay);

  const input = qs('.search-overlay__input', overlay);
  const results = qs('.search-overlay__results', overlay);

  const open = () => { overlay.classList.add('is-open'); setTimeout(() => input.focus(), 80); document.body.style.overflow = 'hidden'; };
  const close = () => { overlay.classList.remove('is-open'); document.body.style.overflow = ''; };

  trigger.addEventListener('click', open);
  qs('.js-search-close', overlay).addEventListener('click', close);
  overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });

  function resultRow(href, img, title, sub, tag) {
    return `<a class="search-result" href="${href}">
      <img src="${img}" alt="" loading="lazy">
      <div><div class="search-result__title">${escapeHtml(title)}</div>
      <div class="text-muted" style="font-size:.85rem">${escapeHtml(sub || '')}</div></div>
      ${tag ? `<span class="pill pill--ghost">${escapeHtml(tag)}</span>` : ''}
    </a>`;
  }

  const run = debounce(async (q) => {
    if (!q.trim()) { results.innerHTML = ''; return; }
    try {
      const [postRes, bookRes, authRes] = await Promise.all([
        api.get(`/posts/search?q=${encodeURIComponent(q)}`).catch(() => ({ posts: [] })),
        api.get(`/books?q=${encodeURIComponent(q)}&limit=6`).catch(() => ({ books: [] })),
        api.get('/authors').catch(() => ({ authors: [] })),
      ]);
      const posts = postRes.posts || [];
      const books = bookRes.books || [];
      const authors = (authRes.authors || []).filter((a) => a.name.toLowerCase().includes(q.toLowerCase())).slice(0, 5);

      if (!posts.length && !books.length && !authors.length) {
        results.innerHTML = '<p class="text-muted" style="padding:24px 0">Aucun résultat. Essayez un autre titre, mangaka ou genre.</p>';
        return;
      }
      let html = '';
      if (posts.length) html += `<h4 class="search-group">Chroniques</h4>` + posts.map((p) =>
        resultRow(`/article.html?slug=${p.slug}`, coverFallback(p.cover_image_url, p.title), p.title, p.book?.author?.name, p.categories?.[0]?.name || p.type)).join('');
      if (books.length) html += `<h4 class="search-group">Séries</h4>` + books.map((b) =>
        resultRow(`/book.html?slug=${b.slug}`, coverFallback(b.cover_image_url, b.title), b.title, b.author?.name, 'Série')).join('');
      if (authors.length) html += `<h4 class="search-group">Mangaka</h4>` + authors.map((a) =>
        resultRow(`/author.html?slug=${a.slug}`, coverFallback(null, a.name), a.name, `${a.books_count || 0} œuvre(s)`, 'Mangaka')).join('');
      results.innerHTML = html;
    } catch { results.innerHTML = '<p class="text-muted">Erreur de recherche.</p>'; }
  }, 300);

  input.addEventListener('input', (e) => run(e.target.value));
}

function closeIcon() { return '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M6 6l12 12M18 6L6 18"/></svg>'; }
