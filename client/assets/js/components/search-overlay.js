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

  const run = debounce(async (q) => {
    if (!q.trim()) { results.innerHTML = ''; return; }
    try {
      const { posts } = await api.get(`/posts/search?q=${encodeURIComponent(q)}`);
      if (!posts.length) { results.innerHTML = '<p class="text-muted" style="padding:24px 0">Aucun livre ne correspond à votre recherche. Essayez un autre titre ou auteur.</p>'; return; }
      results.innerHTML = posts.map((p) => `
        <a class="search-result" href="/article.html?slug=${p.slug}">
          <img src="${coverFallback(p.cover_image_url, p.title)}" alt="" loading="lazy">
          <div><div class="search-result__title">${escapeHtml(p.title)}</div>
          <div class="text-muted" style="font-size:.85rem">${escapeHtml(p.book?.author?.name || '')}</div></div>
          <span class="pill pill--ghost">${escapeHtml(p.categories[0]?.name || p.type)}</span>
        </a>`).join('');
    } catch { results.innerHTML = '<p class="text-muted">Erreur de recherche.</p>'; }
  }, 300);

  input.addEventListener('input', (e) => run(e.target.value));
}

function closeIcon() { return '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M6 6l12 12M18 6L6 18"/></svg>'; }
