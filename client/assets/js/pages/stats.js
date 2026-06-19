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

load();
