'use strict';

/* Seed MINIMAL — aucun manga/article hardcodé.
   On crée seulement : le compte admin + les genres de référence.
   Tout le contenu (séries, chroniques, dossiers) se crée depuis le back-office
   (import Anilist/Inko en 1 clic). */
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const env = require('../src/config/env');

// Genres / démographies manga (données de référence, pas du contenu)
const CATEGORIES = [
  { name: 'Shōnen', slug: 'shonen', color: '#e67e22', icon: 'bolt' },
  { name: 'Seinen', slug: 'seinen', color: '#2c3e50', icon: 'blade' },
  { name: 'Shōjo', slug: 'shojo', color: '#d6336c', icon: 'flower' },
  { name: 'Josei', slug: 'josei', color: '#8e44ad', icon: 'heart' },
  { name: 'Action', slug: 'action', color: '#c0392b', icon: 'spark' },
  { name: 'Aventure', slug: 'aventure', color: '#d35400', icon: 'compass' },
  { name: 'Drame', slug: 'drame', color: '#34495e', icon: 'mask' },
  { name: 'Fantastique', slug: 'fantastique', color: '#27543a', icon: 'moon' },
  { name: 'Science-Fiction', slug: 'science-fiction', color: '#2980b9', icon: 'rocket' },
  { name: 'Horreur', slug: 'horreur', color: '#111111', icon: 'skull' },
  { name: 'Tranche de vie', slug: 'tranche-de-vie', color: '#16a085', icon: 'leaf' },
  { name: 'Comédie', slug: 'comedie', color: '#f1c40f', icon: 'smile' },
  { name: 'Romance', slug: 'romance', color: '#e84393', icon: 'heart' },
  { name: 'Psychologique', slug: 'psychologique', color: '#7f8c8d', icon: 'brain' },
  { name: 'Historique', slug: 'historique', color: '#a0522d', icon: 'scroll' },
  { name: 'Sport', slug: 'sport', color: '#00897b', icon: 'trophy' },
];

async function main() {
  const conn = await mysql.createConnection({
    host: env.db.host, port: env.db.port, user: env.db.user,
    password: env.db.password, database: env.db.name, multipleStatements: true,
  });

  await conn.query('SET FOREIGN_KEY_CHECKS=0');
  for (const t of ['post_views', 'list_books', 'thematic_lists', 'quotes', 'series_assets', 'reading_timeline', 'post_tags', 'post_categories', 'book_tags', 'book_categories', 'tags', 'categories', 'posts', 'books', 'authors', 'newsletter_subscribers', 'users']) {
    await conn.query(`TRUNCATE TABLE ${t}`);
  }
  await conn.query('SET FOREIGN_KEY_CHECKS=1');

  const hash = await bcrypt.hash(env.seed.adminPassword, 12);
  await conn.query('INSERT INTO users (username, email, password_hash, role, bio) VALUES (?,?,?,?,?)',
    [env.seed.adminUsername, env.seed.adminEmail, hash, 'admin', "Chroniqueur manga."]);

  for (const c of CATEGORIES) {
    await conn.query('INSERT INTO categories (name, slug, color, icon) VALUES (?,?,?,?)', [c.name, c.slug, c.color, c.icon]);
  }

  // eslint-disable-next-line no-console
  console.log(`✓ Seed minimal : 1 admin + ${CATEGORIES.length} genres. Aucun contenu hardcodé.`);
  console.log(`  Admin : ${env.seed.adminEmail} / ${env.seed.adminPassword}`);
  console.log('  → Crée tes séries & articles depuis /admin (import Anilist/Inko en 1 clic).');
  await conn.end();
}

main().catch((err) => { console.error('✗ Seed échoué :', err.message); process.exit(1); });
