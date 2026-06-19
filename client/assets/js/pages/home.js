// Page d'accueil — orchestration des 7 sections (§5.1)
import { api } from '../core/api.js';
import { qs, escapeHtml, coverFallback, prefersReducedMotion } from '../core/utils.js';
import { articleCard, articleRow } from '../components/cards.js';
import { initScrollReveal } from '../animations/scroll-reveal.js';
import { splitReveal } from '../animations/gsap-init.js';

async function loadHero() {
  const wrap = qs('#hero-content');
  const object = qs('#hero-object');
  try {
    const { post } = await api.get('/posts/featured');
    if (!post) { wrap.innerHTML = '<h1 class="hero__title font-display">Tsundoku</h1><p class="hero__excerpt">Aucune chronique publiée pour le moment.</p>'; return; }
    const cat = post.categories?.[0];
    wrap.innerHTML = `
      <p class="hero__kicker">${escapeHtml(cat?.name || 'Chronique')}${post.reading_time ? ` · ${post.reading_time} min de lecture` : ''}</p>
      <h1 class="hero__title font-display" id="hero-title">${escapeHtml(post.title)}</h1>
      ${post.book?.author ? `<p class="hero__author">— ${escapeHtml(post.book.author.name)}</p>` : ''}
      <p class="hero__excerpt">${escapeHtml(post.excerpt || '')}</p>
      <a class="btn hero__cta" href="/article.html?slug=${post.slug}">Lire la chronique
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M5 12h14M13 6l6 6-6 6"/></svg>
      </a>`;
    object.innerHTML = `<figure class="hero-book">
      <img class="hero-book__cover" src="${coverFallback(post.cover_image_url, post.book?.title || post.title)}" alt="Couverture : ${escapeHtml(post.book?.title || post.title)}">
    </figure>`;

    if (window.gsap && !prefersReducedMotion()) {
      splitReveal(qs('#hero-title'), { delay: 0.35 });
      window.gsap.from('#hero-content .hero__kicker, #hero-content .hero__author, #hero-content .hero__excerpt, #hero-content .hero__cta',
        { y: 24, opacity: 0, stagger: 0.1, delay: 1, duration: 0.7, ease: 'power2.out' });
      window.gsap.fromTo('.hero-book', { opacity: 0, y: 40, rotateZ: -6 }, { opacity: 1, y: 0, rotateZ: 0, duration: 1.1, delay: 0.5, ease: 'power3.out' });
      if (window.ScrollTrigger) {
        window.gsap.to('.hero-book', { yPercent: -12, ease: 'none', scrollTrigger: { trigger: '#hero', start: 'top top', end: 'bottom top', scrub: true } });
      }
    }
  } catch { wrap.innerHTML = '<h1 class="hero__title font-display">Tsundoku</h1>'; }
}

async function loadRecent() {
  const grid = qs('#recent-grid');
  try {
    const { posts } = await api.get('/posts?limit=6');
    if (!posts.length) { grid.innerHTML = '<p class="text-muted">Aucune chronique n\'a encore été publiée. Revenez bientôt !</p>'; return; }
    const [a, b, c, ...rest] = posts;
    let html = '';
    if (a) html += articleCard(a, 'lg');
    if (b) html += articleCard(b, 'md');
    if (c) html += articleCard(c, 'md');
    if (rest.length) html += `<div class="recent-list">${rest.map(articleRow).join('')}</div>`;
    grid.innerHTML = html;
    initScrollReveal(grid);
  } catch { grid.innerHTML = '<p class="text-muted">Impossible de charger les chroniques.</p>'; }
}

async function loadNowReading() {
  const wrap = qs('#now-reading');
  try {
    const { entries } = await api.get('/timeline?status=en_cours');
    const e = entries[0];
    if (!e) { wrap.remove(); return; }
    wrap.className = 'now-reading reveal';
    wrap.innerHTML = `
      <img class="now-reading__cover" src="${coverFallback(e.book.cover_image_url, e.book.title)}" alt="">
      <div>
        <p class="now-reading__label">En ce moment je lis</p>
        <h3 class="now-reading__title">${escapeHtml(e.book.title)}</h3>
        <p class="now-reading__author">${escapeHtml(e.book.author?.name || '')}</p>
        <div class="progress"><div class="progress__fill" style="width:0"></div></div>
        <p class="now-reading__pct">${e.progress || 0}% lu</p>
      </div>`;
    requestAnimationFrame(() => { qs('.progress__fill', wrap).style.width = `${e.progress || 0}%`; });
    initScrollReveal(wrap.parentElement);
  } catch { wrap.remove(); }
}

async function loadGenres() {
  const row = qs('#genre-row');
  try {
    const { categories } = await api.get('/categories');
    row.innerHTML = categories.filter((c) => c.posts_count > 0 || c.books_count > 0)
      .map((c) => `<a class="genre-pill" style="--cat:${c.color || '#c0392b'}" href="/articles.html?category=${c.slug}">${escapeHtml(c.name)}</a>`).join('');
  } catch { row.innerHTML = ''; }
}

loadHero();
loadRecent();
loadNowReading();
loadGenres();
