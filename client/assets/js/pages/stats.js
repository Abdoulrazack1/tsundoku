// En chiffres (§5.10) : cartes clés + graphiques Chart.js.
import { api } from '../core/api.js';
import { qs } from '../core/utils.js';

const INK = '#1a1a1a', ACCENT = '#c0392b', MUTED = '#8c8c8c', LINE = '#e8e3db';
const PALETTE = ['#2c3e50', '#8e44ad', '#c0392b', '#e67e22', '#27ae60', '#2980b9', '#7f8c8d'];

function statCards(t) {
  const cards = [
    [t.books_read, 'Livres lus'],
    [Number(t.pages_read || 0).toLocaleString('fr-FR'), 'Pages lues'],
    [t.total_authors, 'Auteurs découverts'],
    [t.total_quotes, 'Citations gardées'],
    [t.total_posts, 'Chroniques'],
    [Number(t.total_views || 0).toLocaleString('fr-FR'), 'Lectures cumulées'],
  ];
  return cards.map(([n, l]) => `<div class="stat-card reveal"><div class="stat-card__num">${n ?? 0}</div><div class="stat-card__label">${l}</div></div>`).join('');
}

/* ---- Gamification : profil de lecteur depuis Anilist (badges + niveau) §25 ---- */
const BADGES = [
  { id: 'first', icon: '🌱', label: 'Premiers pas', test: (s) => s.count >= 1 },
  { id: 'reader', icon: '📚', label: 'Lecteur assidu', test: (s) => s.completed >= 25 },
  { id: 'devourer', icon: '🔥', label: 'Dévoreur', test: (s) => s.chapters >= 10000 },
  { id: 'explorer', icon: '🧭', label: 'Explorateur de genres', test: (s) => s.genres >= 8 },
  { id: 'completionist', icon: '🏆', label: 'Complétiste', test: (s) => s.completed >= 100 },
  { id: 'critic', icon: '⭐', label: 'Œil critique', test: (s) => s.mean >= 1 },
  { id: 'marathon', icon: '🌙', label: 'Marathonien', test: (s) => s.chapters >= 25000 },
  { id: 'collector', icon: '🗂️', label: 'Collectionneur', test: (s) => s.count >= 300 },
];

function levelFromChapters(ch) {
  const level = Math.max(1, Math.floor(Math.sqrt(ch / 200)) + 1);
  const cur = Math.pow(level - 1, 2) * 200;
  const next = Math.pow(level, 2) * 200;
  const pct = Math.min(100, Math.round(((ch - cur) / (next - cur)) * 100));
  return { level, pct, next };
}

async function loadReaderProfile() {
  try {
    const data = await api.get('/integration/anilist/user');
    if (!data.configured) return;
    const m = data.user?.statistics?.manga || {};
    const completed = (data.entries || []).filter((e) => e.status === 'lu' || e.status === 'relu').length;
    const genres = new Set((data.entries || []).flatMap((e) => e.genres || [])).size;
    const s = { count: m.count || 0, chapters: m.chaptersRead || 0, mean: m.meanScore || 0, completed, genres };
    const { level, pct, next } = levelFromChapters(s.chapters);
    const unlocked = BADGES.filter((b) => b.test(s));

    const sec = qs('#reader-profile');
    sec.hidden = false;
    sec.innerHTML = `
      <div class="section-head"><p class="kicker">Gamification</p><h2 class="section-head__title font-display" style="font-size:2.2rem">Mon profil de lecteur</h2></div>
      <div class="reader-level">
        <div class="reader-level__num">Niveau ${level}</div>
        <div class="progress" style="max-width:520px;margin-top:10px"><div class="progress__fill" style="width:0"></div></div>
        <p class="text-muted" style="margin-top:8px;font-size:.85rem">${s.chapters.toLocaleString('fr-FR')} chapitres lus · prochain palier à ${next.toLocaleString('fr-FR')}</p>
      </div>
      <div class="badges-grid">
        ${BADGES.map((b) => { const on = unlocked.includes(b); return `<div class="badge ${on ? 'is-unlocked' : ''}" title="${b.label}"><span class="badge__icon">${b.icon}</span><span class="badge__label">${b.label}</span></div>`; }).join('')}
      </div>`;
    requestAnimationFrame(() => { const f = qs('#reader-profile .progress__fill'); if (f) f.style.width = `${pct}%`; });
  } catch { /* Anilist non configuré : section masquée */ }
}

async function load() {
  try {
    const data = await api.get('/stats/public');
    qs('#stat-cards').innerHTML = statCards(data.totals || {});
    qs('#stat-cards').querySelectorAll('.reveal').forEach((c) => c.classList.add('is-visible'));

    if (!window.Chart) return;
    Chart.defaults.font.family = "'Space Grotesk', sans-serif";
    Chart.defaults.color = MUTED;
    qs('#charts').hidden = false;

    const cats = (data.byCategory || []).filter((c) => c.count > 0);
    new Chart(qs('#chart-genres'), {
      type: 'doughnut',
      data: { labels: cats.map((c) => c.name), datasets: [{ data: cats.map((c) => c.count), backgroundColor: cats.map((c, i) => c.color || PALETTE[i % PALETTE.length]), borderColor: 'transparent', borderWidth: 2 }] },
      options: { plugins: { legend: { position: 'right' } }, cutout: '62%' },
    });

    const years = data.byYear || [];
    new Chart(qs('#chart-years'), {
      type: 'line',
      data: { labels: years.map((y) => y.year), datasets: [{ data: years.map((y) => y.count), borderColor: ACCENT, backgroundColor: 'rgba(192,57,43,0.08)', fill: true, tension: 0.35, pointBackgroundColor: ACCENT }] },
      options: { plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, grid: { color: LINE }, ticks: { precision: 0 } }, x: { grid: { display: false } } } },
    });

    const authors = data.topAuthors || [];
    new Chart(qs('#chart-authors'), {
      type: 'bar',
      data: { labels: authors.map((a) => a.name), datasets: [{ data: authors.map((a) => a.books), backgroundColor: INK, borderRadius: 4 }] },
      options: { indexAxis: 'y', plugins: { legend: { display: false } }, scales: { x: { beginAtZero: true, grid: { color: LINE }, ticks: { precision: 0 } }, y: { grid: { display: false } } } },
    });
  } catch (err) {
    qs('#stat-cards').innerHTML = `<div class="empty" style="grid-column:1/-1"><h3>Erreur</h3><p>${err.message}</p></div>`;
  }
}

loadReaderProfile();
load();
