// Fiche série manga (§5.5) : métadonnées manga, liens Inko/Anilist, galerie, similaires.
import { api } from '../core/api.js';
import { qs, getParam, escapeHtml, coverFallback, starsHtml, statusLabel, prefersReducedMotion } from '../core/utils.js';
import { bookCard, kindBadges } from '../components/cards.js';
import { initBook3D } from '../animations/book-3d.js';
import { revealNow } from '../animations/scroll-reveal.js';

const root = qs('#book');
const PUBSTATUS = { en_cours: 'En cours de publication', termine: 'Terminé', pause: 'En pause', annonce: 'Annoncé', inconnu: null };

function metaGrid(b) {
  const items = [
    ['Genres', b.categories?.map((c) => c.name).join(', ')],
    ['Tomes', b.volumes],
    ['Chapitres', b.chapters],
    ['Parution', PUBSTATUS[b.publication_status]],
    ['Année', b.publication_year],
    ['Éditeur VF', b.publisher],
    ['Langue', b.language],
  ].filter(([, v]) => v);
  return `<dl class="book-meta-grid">${items.map(([k, v]) => `<div><dt>${k}</dt><dd>${escapeHtml(String(v))}</dd></div>`).join('')}</dl>`;
}

function externalLinks(b) {
  const links = [];
  if (b.anilist_id) links.push(`<a class="btn btn--sm" target="_blank" rel="noopener" href="https://anilist.co/manga/${b.anilist_id}">Anilist ↗</a>`);
  // Lecture sur Inko (recherche par titre, ou œuvre précise si importée)
  const inkoHref = b.inko_id && b.inko_source
    ? `http://localhost:8088/serie.html?source=${encodeURIComponent(b.inko_source)}&id=${encodeURIComponent(b.inko_id)}`
    : `http://localhost:8088/recherche.html?q=${encodeURIComponent(b.title)}`;
  links.push(`<a class="btn btn--sm btn--solid" target="_blank" rel="noopener" href="${inkoHref}">Lire sur Inko ↗</a>`);
  return `<div class="cluster" style="margin-top:20px">${links.join('')}</div>`;
}

function gallery(assets) {
  const imgs = (assets || []).filter((a) => a.image_url);
  if (!imgs.length) return '';
  const LABEL = { cover: 'Couverture', volume: 'Tome', chapter: 'Chapitre', planche: 'Planche', art: 'Illustration' };
  return `<section class="section">
    <div class="section-head"><p class="kicker">Galerie</p><h2 class="section-head__title font-display" style="font-size:2rem">Couvertures & planches</h2></div>
    <div class="gallery-grid">${imgs.map((a) => `<figure class="gallery-item">
      <img src="${escapeHtml(a.image_url)}" alt="${escapeHtml(a.label || '')}" loading="lazy">
      <figcaption>${LABEL[a.type] || ''}${a.label ? ' · ' + escapeHtml(a.label) : ''}</figcaption>
    </figure>`).join('')}</div>
  </section>`;
}

async function findChronicle(bookId) {
  try {
    const { posts } = await api.get('/posts?limit=50');
    return posts.find((p) => p.book?.id === bookId) || null;
  } catch { return null; }
}

async function render() {
  const slug = getParam('slug');
  if (!slug) { root.innerHTML = '<p class="empty">Série introuvable.</p>'; return; }
  try {
    const { book, similar } = await api.get(`/books/${slug}`);
    document.title = `${book.title} — Tsundoku`;
    const chronicle = await findChronicle(book.id);

    root.innerHTML = `
      <section class="book-detail">
        <div class="book-detail__cover-wrap">
          <div id="book3d" style="aspect-ratio:2/3"></div>
          <img class="book-detail__cover" id="book-cover" src="${coverFallback(book.cover_image_url, book.title)}" alt="Couverture : ${escapeHtml(book.title)}">
        </div>
        <div class="book-detail__main">
          <div class="cluster" style="gap:8px">
            ${kindBadges(book)}
            <span class="status-dot" data-status="${book.status}">${statusLabel(book.status)}</span>
            ${book.rating != null ? starsHtml(book.rating) : ''}
          </div>
          <h1 class="book-detail__title">${escapeHtml(book.title)}</h1>
          ${book.original_title ? `<p class="book-detail__orig">${escapeHtml(book.original_title)}</p>` : ''}
          ${book.author ? `<p class="book-detail__author">— <a href="/author.html?slug=${book.author.slug}">${escapeHtml(book.author.name)}</a></p>` : ''}
          ${metaGrid(book)}
          ${book.synopsis ? `<div class="prose" style="font-size:1.1rem"><p>${escapeHtml(book.synopsis)}</p></div>` : ''}
          ${externalLinks(book)}
          ${chronicle ? `<a class="btn btn--solid btn--block" style="margin-top:14px;max-width:280px" href="/article.html?slug=${chronicle.slug}">Lire la chronique
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M5 12h14M13 6l6 6-6 6"/></svg></a>` : ''}
        </div>
      </section>

      ${gallery(book.assets)}

      ${similar?.length ? `<section class="section">
        <div class="section-head"><p class="kicker">À découvrir aussi</p><h2 class="section-head__title font-display" style="font-size:2rem">Dans le même esprit</h2></div>
        <div class="books-grid">${similar.map(bookCard).join('')}</div>
      </section>` : ''}`;

    revealNow(root);

    if (window.THREE && !prefersReducedMotion() && book.cover_image_url) {
      const holder = qs('#book3d');
      qs('#book-cover').style.display = 'none';
      initBook3D(holder, book.cover_image_url);
    } else {
      qs('#book3d')?.remove();
    }
  } catch (err) {
    root.innerHTML = `<div class="empty"><h3>Série introuvable</h3><p>${escapeHtml(err.message || '')}</p><a class="btn" href="/library.html">Voir les séries</a></div>`;
  }
}

render();
