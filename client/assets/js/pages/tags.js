// Page Tags : nuage de tags (taille par popularité) + filtrage des chroniques.
import { api } from '../core/api.js';
import { qs, getParam, escapeHtml } from '../core/utils.js';
import { articleCard } from '../components/cards.js';
import { revealNow } from '../animations/scroll-reveal.js';

const cloud = qs('#tag-cloud');
const results = qs('#tag-results');

function fontSize(count, max) {
  const min = 1, maxSize = 2.8;
  return (min + (maxSize - min) * (count / (max || 1))).toFixed(2);
}

async function showTag(slug, name) {
  results.innerHTML = '<div class="spinner"></div>';
  try {
    const { posts } = await api.get(`/posts?tag=${encodeURIComponent(slug)}&limit=24`);
    history.replaceState(null, '', `/tags.html?tag=${slug}`);
    qs('#tag-cloud').querySelectorAll('a').forEach((a) => a.classList.toggle('is-active', a.dataset.slug === slug));
    if (!posts.length) { results.innerHTML = `<p class="text-muted">Aucune chronique avec le tag « ${escapeHtml(name)} ».</p>`; return; }
    results.innerHTML = `<div class="section-head"><p class="kicker">Tag · ${escapeHtml(name)}</p><h2 class="section-head__title font-display" style="font-size:2rem">${posts.length} chronique${posts.length > 1 ? 's' : ''}</h2></div>
      <div class="grid-cards">${posts.map((p) => articleCard(p, 'md')).join('')}</div>`;
    revealNow(results);
  } catch (e) { results.innerHTML = `<p class="text-muted">${e.message}</p>`; }
}

async function load() {
  try {
    const { tags } = await api.get('/tags');
    const withPosts = tags.filter((t) => (t.posts_count || 0) + (t.books_count || 0) > 0);
    if (!withPosts.length) { cloud.innerHTML = '<p class="text-muted">Aucun tag pour le moment. Les tags apparaissent quand tu publies des chroniques.</p>'; return; }
    const max = Math.max(...withPosts.map((t) => t.posts_count || 1));
    cloud.innerHTML = withPosts.map((t) =>
      `<a href="/tags.html?tag=${t.slug}" data-slug="${t.slug}" style="font-size:${fontSize(t.posts_count || 1, max)}rem">${escapeHtml(t.name)}<small>${t.posts_count || 0}</small></a>`).join('');
    cloud.addEventListener('click', (e) => {
      const a = e.target.closest('a'); if (!a) return;
      e.preventDefault();
      showTag(a.dataset.slug, a.textContent.replace(/\d+$/, '').trim());
    });
    const initial = getParam('tag');
    if (initial) { const t = withPosts.find((x) => x.slug === initial); if (t) showTag(t.slug, t.name); }
  } catch (e) { cloud.innerHTML = `<p class="text-muted">${e.message}</p>`; }
}

load();
