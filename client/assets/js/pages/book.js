// Fiche livre (§5.5) : hero 3D, métadonnées, synopsis, citations, similaires.
import { api } from '../core/api.js';
import { qs, getParam, escapeHtml, coverFallback, starsHtml, statusLabel, prefersReducedMotion } from '../core/utils.js';
import { bookCard } from '../components/cards.js';
import { initBook3D } from '../animations/book-3d.js';
import { revealNow } from '../animations/scroll-reveal.js';

const root = qs('#book');

function metaGrid(b) {
  const items = [
    ['Genre', b.categories?.map((c) => c.name).join(', ')],
    ['Année', b.publication_year],
    ['Éditeur', b.publisher],
    ['Pages', b.pages],
    ['Langue', b.language],
    ['ISBN', b.isbn],
  ].filter(([, v]) => v);
  return `<dl class="book-meta-grid">${items.map(([k, v]) => `<div><dt>${k}</dt><dd>${escapeHtml(String(v))}</dd></div>`).join('')}</dl>`;
}

async function findChronicle(bookId) {
  try {
    const { posts } = await api.get('/posts?limit=50');
    return posts.find((p) => p.book?.id === bookId) || null;
  } catch { return null; }
}

async function render() {
  const slug = getParam('slug');
  if (!slug) { root.innerHTML = '<p class="empty">Livre introuvable.</p>'; return; }
  try {
    const { book, quotes, similar } = await api.get(`/books/${slug}`);
    document.title = `${book.title} — Tsundoku`;
    const chronicle = await findChronicle(book.id);

    root.innerHTML = `
      <section class="book-detail">
        <div class="book-detail__cover-wrap">
          <div id="book3d" style="aspect-ratio:2/3"></div>
          <img class="book-detail__cover" id="book-cover" src="${coverFallback(book.cover_image_url, book.title)}" alt="Couverture : ${escapeHtml(book.title)}">
          ${book.source && book.source !== 'tsundoku' ? `<span class="badge-source" style="margin-top:12px;display:inline-block">${book.source}</span>` : ''}
        </div>
        <div class="book-detail__main">
          <div class="cluster">
            <span class="status-dot" data-status="${book.status}">${statusLabel(book.status)}</span>
            ${book.rating != null ? starsHtml(book.rating) : ''}
          </div>
          <h1 class="book-detail__title">${escapeHtml(book.title)}</h1>
          ${book.author ? `<p class="book-detail__author">— <a href="/author.html?slug=${book.author.slug}">${escapeHtml(book.author.name)}</a></p>` : ''}
          ${metaGrid(book)}
          ${book.synopsis ? `<div class="prose" style="font-size:1.1rem"><p>${escapeHtml(book.synopsis)}</p></div>` : ''}
          ${chronicle ? `<a class="btn btn--solid" style="margin-top:24px" href="/article.html?slug=${chronicle.slug}">Lire la chronique
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M5 12h14M13 6l6 6-6 6"/></svg></a>` : ''}
        </div>
      </section>

      ${similar?.length ? `<section class="section">
        <div class="section-head"><p class="kicker">À découvrir aussi</p><h2 class="section-head__title font-display" style="font-size:2rem">Dans le même esprit</h2></div>
        <div class="books-grid">${similar.map(bookCard).join('')}</div>
      </section>` : ''}`;

    revealNow(root);

    // Livre 3D interactif (sinon on garde la couverture 2D)
    if (window.THREE && !prefersReducedMotion() && book.cover_image_url) {
      const holder = qs('#book3d');
      qs('#book-cover').style.display = 'none';
      initBook3D(holder, book.cover_image_url);
    } else {
      qs('#book3d')?.remove();
    }
  } catch (err) {
    root.innerHTML = `<div class="empty"><h3>Livre introuvable</h3><p>${escapeHtml(err.message || '')}</p><a class="btn" href="/library.html">Voir la bibliothèque</a></div>`;
  }
}

render();
