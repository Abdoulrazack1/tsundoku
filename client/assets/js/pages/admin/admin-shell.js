// Coquille admin partagée : garde d'authentification + sidebar + déconnexion.
import { api, setToken } from '../../core/api.js';
import { qs } from '../../core/utils.js';
import { initTheme } from '../../components/dark-mode.js';

initTheme();

const NAV = [
  ['Tableau de bord', '/admin/dashboard.html', 'grid'],
  ['Articles', '/admin/articles.html', 'file'],
  ['Nouvel article', '/admin/post-editor.html', 'plus'],
  ['Séries / Mangas', '/admin/books.html', 'book'],
  ['Médiathèque', '/admin/media.html', 'image'],
  ['Intégrations', '/admin/integrations.html', 'sync'],
  ['API', '/admin/api.html', 'code'],
];

const ICONS = {
  grid: '<rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/>',
  file: '<path d="M14 3H6a2 2 0 00-2 2v14a2 2 0 002 2h12a2 2 0 002-2V9z"/><path d="M14 3v6h6"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  book: '<path d="M4 19.5A2.5 2.5 0 016.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/>',
  sync: '<path d="M21 12a9 9 0 11-3-6.7L21 8"/><path d="M21 3v5h-5"/>',
  image: '<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="9" cy="9" r="2"/><path d="M21 15l-5-5L5 21"/>',
  code: '<path d="M16 18l6-6-6-6M8 6l-6 6 6 6"/>',
};

/** Vérifie la session ; redirige vers login si non authentifié. */
export async function requireAdmin() {
  try {
    const { user } = await api.auth.get('/auth/me');
    return user;
  } catch {
    // Tente un refresh via cookie HttpOnly avant d'abandonner
    const ok = await api.tryRefresh();
    if (ok) { try { return (await api.auth.get('/auth/me')).user; } catch { /* fallthrough */ } }
    location.href = '/admin/login.html';
    return null;
  }
}

export function renderSidebar(activePath, user) {
  const slot = qs('[data-admin-sidebar]');
  if (!slot) return;
  slot.outerHTML = `<aside class="admin-sidebar">
    <a class="logo" href="/" aria-label="Tsundoku"><span class="logo__mark"><span class="logo__kanji">読</span></span><span class="logo__type">Tsundoku</span></a>
    <nav class="admin-nav">
      ${NAV.map(([t, h, ic]) => `<a href="${h}" class="${activePath === h ? 'is-active' : ''}">
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.5">${ICONS[ic]}</svg>${t}</a>`).join('')}
    </nav>
    <div class="admin-user">
      <div style="margin-bottom:8px;color:var(--color-ink-light)">${user?.username || 'Admin'}</div>
      <button class="btn btn--sm" id="logout-btn" style="border-color:rgba(255,255,255,0.2);color:var(--color-ink-light)">Déconnexion</button>
    </div>
  </aside>`;
  qs('#logout-btn')?.addEventListener('click', async () => {
    await api.post('/auth/logout').catch(() => {});
    setToken(null);
    location.href = '/admin/login.html';
  });
}
