// Détail d'une liste thématique (§5.9).
import { api } from '../core/api.js';
import { qs, getParam, escapeHtml } from '../core/utils.js';
import { bookCard } from '../components/cards.js';
import { revealNow } from '../animations/scroll-reveal.js';

const root = qs('#list');

async function render() {
  const slug = getParam('slug');
  if (!slug) { root.innerHTML = '<p class="empty">Liste introuvable.</p>'; return; }
  try {
    const { list } = await api.get(`/lists/${slug}`);
    document.title = `${list.title} — Tsundoku`;
    root.innerHTML = `
      <header class="page-head">
        <p class="kicker">Collection · ${list.books?.length || 0} livres</p>
        <h1 class="page-head__title">${escapeHtml(list.title)}</h1>
        <p class="page-head__sub">${escapeHtml(list.description || '')}</p>
        <hr class="rule">
      </header>
      <section class="section--tight">
        <div class="books-grid">${(list.books || []).map(bookCard).join('')}</div>
      </section>`;
    revealNow(root);
  } catch (err) {
    root.innerHTML = `<div class="empty"><h3>Liste introuvable</h3><p>${escapeHtml(err.message || '')}</p><a class="btn" href="/lists.html">Toutes les listes</a></div>`;
  }
}

render();
