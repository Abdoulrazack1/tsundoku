// Fabriques de cartes (article, série, ligne) — §5.1
import { escapeHtml, coverFallback, starsHtml, formatDate } from '../core/utils.js';

const DEMO = { shonen: 'Shōnen', seinen: 'Seinen', shojo: 'Shōjo', josei: 'Josei', kodomo: 'Kodomo' };
const KIND = { manga: 'Manga', manhwa: 'Manhwa', manhua: 'Manhua', novel: 'Light Novel', bd: 'BD' };
export function kindBadges(b) {
  if (!b) return '';
  let out = '';
  if (b.kind && KIND[b.kind]) out += `<span class="tag-kind">${KIND[b.kind]}</span>`;
  if (b.demographic && DEMO[b.demographic]) out += `<span class="tag-demo">${DEMO[b.demographic]}</span>`;
  return out;
}

export function articleCard(p, variant = 'md') {
  const cat = p.categories?.[0];
  const catStyle = cat?.color ? `style="--cat:${cat.color}"` : '';
  return `
  <article class="article-card article-card--${variant} reveal">
    <a class="article-card__media" href="/article.html?slug=${p.slug}" aria-label="${escapeHtml(p.title)}">
      <img src="${coverFallback(p.cover_image_url, p.book?.title || p.title)}" alt="Couverture : ${escapeHtml(p.title)}" loading="lazy">
    </a>
    <div class="article-card__body">
      <div class="cluster">
        ${['dossier', 'analyse'].includes(p.type) ? `<span class="pill pill--type">${p.type === 'dossier' ? 'Dossier' : 'Analyse'}</span>` : ''}
        ${cat ? `<span class="pill pill--cat" ${catStyle}>${escapeHtml(cat.name)}</span>` : ''}
        ${kindBadges(p.book)}
        ${p.reading_time ? `<span class="text-muted" style="font-size:.8rem">${p.reading_time} min</span>` : ''}
      </div>
      <a href="/article.html?slug=${p.slug}"><h3 class="article-card__title">${escapeHtml(p.title)}</h3></a>
      ${variant === 'lg' && p.excerpt ? `<p class="article-card__excerpt">${escapeHtml(p.excerpt)}</p>` : ''}
      <div class="article-card__meta">
        ${p.book?.author ? `<span>— ${escapeHtml(p.book.author.name)}</span>` : ''}
        ${p.rating != null ? starsHtml(p.rating) : ''}
      </div>
    </div>
  </article>`;
}

export function articleRow(p) {
  return `
  <a class="article-row reveal" href="/article.html?slug=${p.slug}">
    <img class="article-row__thumb" src="${coverFallback(p.cover_image_url, p.title)}" alt="" loading="lazy">
    <div>
      <div class="article-row__title">${escapeHtml(p.title)}</div>
      <div class="text-muted" style="font-size:.85rem">${escapeHtml(p.book?.author?.name || '')}</div>
    </div>
    <div class="text-muted" style="font-size:.8rem;text-align:right">
      ${p.categories?.[0] ? escapeHtml(p.categories[0].name) + '<br>' : ''}${formatDate(p.published_at, { day: 'numeric', month: 'short', year: 'numeric' })}
    </div>
  </a>`;
}

export function bookCard(b) {
  return `
  <div class="book-card reveal">
    <a class="book-cover" href="/book.html?slug=${b.slug}">
      <img src="${coverFallback(b.cover_image_url, b.title)}" alt="Couverture : ${escapeHtml(b.title)}" loading="lazy">
    </a>
    <div>
      <a href="/book.html?slug=${b.slug}"><div class="book-card__title">${escapeHtml(b.title)}</div></a>
      <div class="book-card__author">${escapeHtml(b.author?.name || '')}</div>
      <div class="cluster" style="margin-top:6px;gap:6px">
        ${kindBadges(b)}
        <span class="status-dot" data-status="${b.status}">${labelOf(b.status)}</span>
        ${b.rating != null ? starsHtml(b.rating) : ''}
      </div>
    </div>
  </div>`;
}

function labelOf(s) {
  return ({ lu: 'Lu', en_cours: 'En cours', a_lire: 'À lire', abandonne: 'Abandonné', relu: 'Relu' })[s] || s;
}
