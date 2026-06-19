// Page auteur (§5.6) : bio, bibliographie, chroniques liées, statistiques.
import { api } from '../core/api.js';
import { qs, getParam, escapeHtml, coverFallback, formatDate } from '../core/utils.js';
import { bookCard, articleCard } from '../components/cards.js';
import { revealNow } from '../animations/scroll-reveal.js';

const root = qs('#author');

function lifespan(a) {
  const bits = [];
  if (a.nationality) bits.push(escapeHtml(a.nationality));
  if (a.birth_date) bits.push(`${formatDate(a.birth_date, { year: 'numeric' })}${a.death_date ? ' – ' + formatDate(a.death_date, { year: 'numeric' }) : ''}`);
  return bits.join(' · ');
}

async function render() {
  const slug = getParam('slug');
  if (!slug) { root.innerHTML = '<p class="empty">Auteur introuvable.</p>'; return; }
  try {
    const { author, books, stats, posts } = await api.get(`/authors/${slug}`);
    document.title = `${author.name} — Tsundoku`;
    const initial = author.name.trim().charAt(0).toUpperCase();

    root.innerHTML = `
      <section class="author-hero">
        ${author.image_url
          ? `<img class="author-hero__avatar" src="${author.image_url}" alt="${escapeHtml(author.name)}">`
          : `<div class="author-hero__avatar">${initial}</div>`}
        <div>
          <p class="kicker">Auteur</p>
          <h1 class="author-hero__name">${escapeHtml(author.name)}</h1>
          <p class="author-hero__meta">${lifespan(author)}</p>
          <div class="author-stats">
            <div><div class="stat-num">${stats?.total_books || 0}</div><div class="stat-label">Livres</div></div>
            <div><div class="stat-num">${stats?.read_books || 0}</div><div class="stat-label">Lus</div></div>
            <div><div class="stat-num">${stats?.avg_rating ? Number(stats.avg_rating).toFixed(1) : '—'}</div><div class="stat-label">Note moyenne</div></div>
          </div>
        </div>
      </section>

      ${author.bio ? `<section class="section measure"><div class="prose reveal"><p>${escapeHtml(author.bio)}</p></div></section>` : ''}

      ${books?.length ? `<section class="section">
        <div class="section-head"><p class="kicker">Bibliographie</p><h2 class="section-head__title font-display" style="font-size:2rem">Ses œuvres</h2></div>
        <div class="books-grid">${books.map(bookCard).join('')}</div>
      </section>` : ''}

      ${posts?.length ? `<section class="section">
        <div class="section-head"><p class="kicker">Sur le blog</p><h2 class="section-head__title font-display" style="font-size:2rem">Chroniques liées</h2></div>
        <div class="grid-cards">${posts.map((p) => articleCard(p, 'md')).join('')}</div>
      </section>` : ''}`;

    revealNow(root);
  } catch (err) {
    root.innerHTML = `<div class="empty"><h3>Auteur introuvable</h3><p>${escapeHtml(err.message || '')}</p><a class="btn" href="/library.html">Voir la bibliothèque</a></div>`;
  }
}

render();
