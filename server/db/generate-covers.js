'use strict';

/* Génère des couvertures SVG éditoriales locales pour chaque livre,
   puis met à jour cover_image_url (livres + chroniques liées).
   100% fiable, instantané, cohérent avec la DA (washi / vermillon / kanji). */
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
const env = require('../src/config/env');

const outDir = path.join(__dirname, '..', '..', 'client', 'uploads', 'covers');
fs.mkdirSync(outDir, { recursive: true });

const esc = (s) => String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** Découpe un titre en lignes d'environ maxChars caractères. */
function wrap(text, maxChars = 16) {
  const words = String(text).split(/\s+/);
  const lines = [];
  let line = '';
  for (const w of words) {
    if ((line + ' ' + w).trim().length > maxChars && line) { lines.push(line.trim()); line = w; }
    else line = (line + ' ' + w).trim();
  }
  if (line) lines.push(line.trim());
  return lines.slice(0, 4);
}

const KANJI = ['読', '本', '物', '語', '間', '静', '夢', '海'];

function buildSVG({ title, author, color, year, idx }) {
  const W = 400, H = 600;
  const ink = '#211d1a';
  const paper = '#efe7d8';
  const accent = '#c0392b';
  const cat = color || accent;
  const kanji = KANJI[idx % KANJI.length];
  const lines = wrap(title, 15);
  const titleSize = lines.length > 3 ? 34 : lines.length > 2 ? 40 : 46;
  const startY = H / 2 - ((lines.length - 1) * titleSize * 1.1) / 2 - 10;
  const titleTspans = lines.map((l, i) =>
    `<tspan x="${W / 2}" y="${startY + i * titleSize * 1.12}">${esc(l)}</tspan>`).join('');

  // fines lignes décoratives (texture papier)
  let ribs = '';
  for (let y = 70; y < H - 70; y += 9) ribs += `<line x1="34" y1="${y}" x2="${W - 34}" y2="${y}" stroke="${ink}" stroke-width="0.5" opacity="0.025"/>`;

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">
  <rect width="${W}" height="${H}" fill="${paper}"/>
  <rect x="0" y="0" width="14" height="${H}" fill="${cat}" opacity="0.9"/>
  <rect x="14" y="0" width="3" height="${H}" fill="${ink}" opacity="0.15"/>
  ${ribs}
  <text x="${W - 40}" y="${H - 30}" text-anchor="end" font-family="Georgia, 'Noto Serif JP', serif" font-size="190" fill="${ink}" opacity="0.05">${kanji}</text>
  <rect x="34" y="34" width="${W - 68}" height="${H - 68}" fill="none" stroke="${ink}" stroke-width="1" opacity="0.18"/>
  <text x="${W / 2}" y="92" text-anchor="middle" font-family="'Inter', Helvetica, Arial, sans-serif" font-size="13" letter-spacing="3" fill="${cat}">TSUNDOKU</text>
  <line x1="${W / 2 - 26}" y1="108" x2="${W / 2 + 26}" y2="108" stroke="${accent}" stroke-width="1.5"/>
  <text text-anchor="middle" font-family="Georgia, 'Playfair Display', serif" font-weight="700" font-size="${titleSize}" fill="${ink}">${titleTspans}</text>
  <line x1="${W / 2 - 34}" y1="${H - 132}" x2="${W / 2 + 34}" y2="${H - 132}" stroke="${accent}" stroke-width="1.5"/>
  <text x="${W / 2}" y="${H - 104}" text-anchor="middle" font-family="'Inter', Helvetica, Arial, sans-serif" font-size="15" letter-spacing="2.5" fill="${ink}" opacity="0.7">${esc((author || '').toUpperCase())}</text>
  ${year ? `<text x="${W / 2}" y="${H - 76}" text-anchor="middle" font-family="'Inter', sans-serif" font-size="12" letter-spacing="2" fill="${ink}" opacity="0.4">${year}</text>` : ''}
</svg>`;
}

async function main() {
  const conn = await mysql.createConnection({
    host: env.db.host, port: env.db.port, user: env.db.user, password: env.db.password, database: env.db.name,
  });

  // Uniquement les séries SANS couverture (on ne touche pas aux vraies covers Anilist/Inko)
  const [books] = await conn.query(`
    SELECT b.id, b.slug, b.title, b.publication_year, a.name AS author,
      (SELECT c.color FROM book_categories bc JOIN categories c ON bc.category_id=c.id WHERE bc.book_id=b.id LIMIT 1) AS color
    FROM books b LEFT JOIN authors a ON b.author_id=a.id
    WHERE b.cover_image_url IS NULL OR b.cover_image_url = ''`);
  if (!books.length) { console.log('✓ Toutes les séries ont déjà une couverture (Anilist/Inko).'); await conn.end(); return; }

  let i = 0;
  for (const b of books) {
    const svg = buildSVG({ title: b.title, author: b.author, color: b.color, year: b.publication_year, idx: i++ });
    fs.writeFileSync(path.join(outDir, `${b.slug}.svg`), svg, 'utf8');
    const url = `/uploads/covers/${b.slug}.svg`;
    await conn.query('UPDATE books SET cover_image_url=? WHERE id=?', [url, b.id]);
    await conn.query('UPDATE posts SET cover_image_url=? WHERE book_id=?', [url, b.id]);
    await conn.query('UPDATE thematic_lists SET cover_image_url=? WHERE cover_image_url LIKE ?', [url, `%${b.slug}%`]);
  }

  // Couverture de liste : recompose à partir d'un livre existant déjà mis à jour
  const [[firstList]] = await conn.query('SELECT id FROM thematic_lists LIMIT 1');
  if (firstList) {
    const [[lb]] = await conn.query('SELECT b.cover_image_url FROM list_books lb JOIN books b ON lb.book_id=b.id WHERE lb.list_id=? ORDER BY lb.order_in_list LIMIT 1', [firstList.id]);
    if (lb) await conn.query('UPDATE thematic_lists SET cover_image_url=? WHERE id=?', [lb.cover_image_url, firstList.id]);
  }

  // eslint-disable-next-line no-console
  console.log(`✓ ${books.length} couvertures SVG générées dans client/uploads/covers/.`);
  await conn.end();
}

main().catch((e) => { console.error('✗', e.message); process.exit(1); });
