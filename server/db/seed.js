'use strict';

/* Données initiales — orientées MANGA. Admin, genres, mangakas, séries,
   chroniques sérieuses, timeline, listes. Couvertures enrichies via Anilist
   (vraies covers) avec repli SVG par generate-covers.js. */
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const env = require('../src/config/env');
const slugify = require('../src/utils/slugify');
const { calculateReadingTime } = require('../src/utils/readingTime');
const anilist = require('../src/services/anilist.service');

// Genres / démographies manga
const CATEGORIES = [
  { name: 'Shōnen', slug: 'shonen', color: '#e67e22', icon: 'bolt' },
  { name: 'Seinen', slug: 'seinen', color: '#2c3e50', icon: 'blade' },
  { name: 'Shōjo', slug: 'shojo', color: '#d6336c', icon: 'flower' },
  { name: 'Josei', slug: 'josei', color: '#8e44ad', icon: 'heart' },
  { name: 'Action', slug: 'action', color: '#c0392b', icon: 'spark' },
  { name: 'Drame', slug: 'drame', color: '#34495e', icon: 'mask' },
  { name: 'Fantastique', slug: 'fantastique', color: '#27543a', icon: 'moon' },
  { name: 'Science-Fiction', slug: 'science-fiction', color: '#2980b9', icon: 'rocket' },
  { name: 'Horreur', slug: 'horreur', color: '#111111', icon: 'skull' },
  { name: 'Tranche de vie', slug: 'tranche-de-vie', color: '#16a085', icon: 'leaf' },
  { name: 'Psychologique', slug: 'psychologique', color: '#7f8c8d', icon: 'brain' },
  { name: 'Historique', slug: 'historique', color: '#a0522d', icon: 'scroll' },
];

// mangakas : [name, nationality, birth, death, bio]
const AUTHORS = [
  ['Kentarō Miura', 'Japon', '1966-07-11', '2021-05-06', "Mangaka culte, Miura a consacré sa vie à « Berserk », fresque dark fantasy à la précision graphique inégalée. Son trait obsessionnel a redéfini les limites du dessin de manga."],
  ['Takehiko Inoue', 'Japon', '1967-01-12', null, "Maître du réalisme et du geste, Inoue (« Slam Dunk », « Vagabond », « Real ») peint le sport et le sabre avec une intensité picturale rare, mêlant encre et introspection."],
  ['Makoto Yukimura', 'Japon', '1976-05-08', null, "Auteur de « Planetes » puis de « Vinland Saga », Yukimura interroge la violence, la vengeance et la rédemption à travers l'épopée viking, dans un souci historique méticuleux."],
  ['Tatsuki Fujimoto', 'Japon', '1992-10-10', null, "Voix punk de sa génération, Fujimoto (« Chainsaw Man », « Look Back ») bouscule les codes du shōnen avec un mélange de cinéma, d'absurde et d'émotion brute."],
  ['Naoki Urasawa', 'Japon', '1960-01-02', null, "Orfèvre du suspense, Urasawa (« Monster », « 20th Century Boys », « Pluto ») construit des thrillers psychologiques d'une ampleur romanesque, portés par un humanisme inquiet."],
  ['Inio Asano', 'Japon', '1980-09-22', null, "Chroniqueur du malaise contemporain, Asano (« Oyasumi Punpun », « Bonne nuit Punpun », « Solanin ») capte la mélancolie de la jeunesse japonaise avec une crudité et une beauté désarmantes."],
  ['Hiromu Arakawa', 'Japon', '1973-05-08', null, "Autrice de « Fullmetal Alchemist », Arakawa allie worldbuilding rigoureux, humour et gravité morale, dans l'un des shōnen les mieux construits jamais publiés."],
  ['Eiichirō Oda', 'Japon', '1975-01-01', null, "Architecte de « One Piece », le manga le plus vendu de l'histoire, Oda déploie depuis 1997 un monde foisonnant porté par l'aventure, l'amitié et la liberté."],
];

// séries : [title, original, mangakaIdx, year, publisher, volumes, chapters, kind, demo, readStatus, pubStatus, rating, cats, tags, synopsis, anilistSearch]
const SERIES = [
  ['Berserk', 'ベルセルク', 0, 1989, 'Glénat', 41, 374, 'manga', 'seinen', 'en_cours', 'en_cours', 5.0,
    ['seinen', 'fantastique', 'horreur', 'drame'], ['dark-fantasy', 'guts', 'tragédie'],
    "Marqué du sceau du sacrifice, Guts traque les Apôtres dans un monde médiéval impitoyable. Une dark fantasy somme sur l'amitié, la trahison et la rage de survivre.", 'Berserk'],
  ['Vagabond', 'バガボンド', 1, 1998, 'Tonkam', 37, 327, 'manga', 'seinen', 'lu', 'pause', 5.0,
    ['seinen', 'historique', 'action', 'psychologique'], ['samouraï', 'musashi', 'sumi-e'],
    "Librement inspiré de la vie de Miyamoto Musashi, le récit du passage d'un jeune homme furieux à l'épéiste en quête du vide intérieur.", 'Vagabond'],
  ['Vinland Saga', 'ヴィンランド・サガ', 2, 2005, 'Kurokawa', 28, 220, 'manga', 'seinen', 'en_cours', 'en_cours', 4.5,
    ['seinen', 'historique', 'action', 'drame'], ['vikings', 'vengeance', 'rédemption'],
    "Thorfinn grandit dans la vengeance avant de chercher une terre sans guerre. L'épopée viking comme chemin vers la non-violence.", 'Vinland Saga'],
  ['Chainsaw Man', 'チェンソーマン', 3, 2018, 'Kazé', 17, 190, 'manga', 'shonen', 'lu', 'en_cours', 4.5,
    ['shonen', 'action', 'horreur'], ['démons', 'punk', 'denji'],
    "Denji fusionne avec son démon-tronçonneuse Pochita pour survivre. Un shōnen punk, cru et étonnamment tendre sur le désir d'une vie simple.", 'Chainsaw Man'],
  ['Monster', 'MONSTER', 4, 1994, 'Kana', 18, 162, 'manga', 'seinen', 'lu', 'termine', 5.0,
    ['seinen', 'psychologique', 'drame'], ['thriller', 'tenma', 'johan'],
    "Le Dr Tenma sauve un enfant qui deviendra un tueur. Un thriller vertigineux sur le bien, le mal et la responsabilité.", 'Monster', 30001],
  ['Oyasumi Punpun', 'おやすみプンプン', 5, 2007, 'Kana', 13, 147, 'manga', 'seinen', 'lu', 'termine', 4.5,
    ['seinen', 'tranche-de-vie', 'psychologique', 'drame'], ['dépression', 'jeunesse', 'asano'],
    "La vie de Punpun, de l'enfance à l'âge adulte, dans une banlieue japonaise grise. Une plongée intime et dévastatrice dans le mal-être.", 'Goodnight Punpun'],
  ['Fullmetal Alchemist', '鋼の錬金術師', 6, 2001, 'Kurokawa', 27, 116, 'manga', 'shonen', 'lu', 'termine', 5.0,
    ['shonen', 'fantastique', 'action', 'drame'], ['alchimie', 'elric', 'équivalence'],
    "Deux frères transgressent le tabou de l'alchimie et en paient le prix. Un shōnen d'une rigueur narrative exemplaire.", 'Fullmetal Alchemist'],
  ['One Piece', 'ワンピース', 7, 1997, 'Glénat', 108, 1120, 'manga', 'shonen', 'en_cours', 'en_cours', 4.5,
    ['shonen', 'action'], ['pirates', 'luffy', 'aventure'],
    "Luffy et son équipage cherchent le trésor ultime. La plus grande épopée d'aventure du manga moderne.", 'One Piece'],
];

// chroniques : [seriesIdx, title, excerpt, featured, type, rating, ratingArt, ratingStory, ratingChars, hasSpoilers, contentHTML]
const POSTS = [
  [0, "Berserk : la forge d'une obsession", "Relire Berserk, c'est mesurer ce qu'un seul homme a pu graver dans le papier. Au-delà du gore, une méditation sur la volonté nue.", true, 'chronique', 5.0, 5.0, 4.5, 5.0, false,
    `<p>Il existe des œuvres qu'on ne lit pas : on les <em>endure</em>, au sens le plus noble. <strong>Berserk</strong> est de celles-là. Derrière la réputation de violence se cache l'un des dessins les plus obsessionnels de l'histoire du manga.</p>
     <h2>Le trait comme cicatrice</h2>
     <p>Chez Miura, chaque planche est une orfèvrerie. Les armures bossèlent, les arbres se tordent, les foules grouillent — et pourtant rien n'est gratuit. La densité graphique <em>est</em> le propos : un monde qui pèse sur les épaules de Guts.</p>
     <blockquote>« Personne ne peut survivre entièrement seul. Mais l'épée, elle, ne ment jamais. »</blockquote>
     <h2>La rage comme moteur, la tendresse comme abîme</h2>
     <p>On réduit souvent Berserk à sa noirceur. C'est oublier l'arc du Faucon, sa lumière, et la douceur impossible entre Guts et Casca. La tragédie ne fonctionne que parce que l'espoir a d'abord existé.</p>
     <p>Inachevé, le manga reste un sommet. La mort de Miura en 2021 a laissé une plaie ouverte dans le médium — et la preuve qu'une vie de travail peut devenir un monument.</p>`],
  [1, "Vagabond, ou l'art de tenir le sabre", "Inoue ne dessine pas des combats : il dessine des états de conscience. Vagabond est une leçon de peinture autant qu'un récit de samouraï.", true, 'analyse', 5.0, 5.0, 4.5, 4.5, false,
    `<p>Adapter Musashi, c'était risquer le film de sabre déjà vu. <strong>Takehiko Inoue</strong> en fait tout autre chose : une enquête sur le vide intérieur, peinte au pinceau.</p>
     <h2>L'encre qui respire</h2>
     <p>Les passages au sumi-e — ces planches lavées d'encre — ne sont pas des prouesses décoratives. Elles traduisent l'instant où l'épéiste cesse de penser. Le dessin devient l'esprit du personnage.</p>
     <blockquote>« Fort ? Que veut dire être fort ? »</blockquote>
     <h2>Devenir invincible sous le ciel</h2>
     <p>Le jeune Takezō veut être « invincible sous le ciel ». Le récit démonte patiemment cette ambition pour lui substituer une autre question : comment vivre ? Vagabond est, in fine, un manga sur la paix.</p>`],
  [2, "Vinland Saga : la longue route hors de la violence", "Commencer dans le sang pour finir dans les champs. Yukimura signe l'un des plus beaux récits de rédemption du manga.", false, 'chronique', 4.5, 4.0, 5.0, 4.5, true,
    `<p>Peu de mangas osent ce virage : faire d'un récit de vengeance vikings une ode au pacifisme. <strong>Vinland Saga</strong> le réussit avec une patience d'historien.</p>
     <h2>« Tu n'as pas d'ennemis »</h2>
     <p>La phrase de Thors hante tout l'ouvrage. Thorfinn met des centaines de chapitres à la comprendre — et nous avec lui. La violence n'y est jamais stylisée gratuitement : elle coûte.</p>
     <blockquote>« Un vrai guerrier n'a pas besoin d'épée. »</blockquote>
     <p>De l'esclave au fermier, le héros se reconstruit par le travail de la terre. Rarement la rédemption aura semblé aussi concrète.</p>`],
  [3, "Chainsaw Man : le punk et le chien", "Sous le chaos et le sang, un cri très simple : avoir une vie normale. Fujimoto réinvente le shōnen avec une sincérité brutale.", false, 'chronique', 4.5, 4.5, 4.5, 5.0, false,
    `<p><strong>Chainsaw Man</strong> ressemble à un film de série B sous amphétamines. Mais derrière le grand-guignol, Fujimoto cache une mélancolie redoutable.</p>
     <h2>Denji ne veut pas sauver le monde</h2>
     <p>Il veut du pain avec de la confiture, un toit, peut-être toucher une poitrine. Cette modestie des désirs, dans un genre obsédé par les grands destins, est subversive.</p>
     <blockquote>« Mes rêves ? Manger à ma faim et dormir au chaud. »</blockquote>
     <p>Le découpage emprunte au cinéma : plans larges muets, ruptures de rythme, gags absurdes. Un shōnen d'auteur, paradoxe assumé.</p>`],
  [4, "Monster : l'anatomie du mal ordinaire", "Urasawa pose une question simple et terrible : a-t-on le droit de tuer pour empêcher de tuer ? 18 tomes pour ne jamais y répondre.", false, 'dossier', 5.0, 4.5, 5.0, 5.0, true,
    `<p><strong>Monster</strong> est un thriller, mais c'est surtout un traité de morale déguisé. Urasawa y dissèque le mal sans jamais le rendre spectaculaire.</p>
     <h2>Le scalpel et la culpabilité</h2>
     <p>Le Dr Tenma sauve la vie d'un enfant qui deviendra Johan, un tueur d'une froideur métaphysique. Le récit refuse les explications faciles : le mal n'a pas de cause unique.</p>
     <blockquote>« Il n'y a rien de spécial à être en vie. »</blockquote>
     <p>Découpage limpide, casting immense, Europe post-Mur reconstituée au cordeau : Monster est la démonstration qu'un manga peut rivaliser avec les plus grands romans noirs.</p>`],
];

const cover = (isbnOrSlug) => null; // les covers viennent d'Anilist (seed) sinon SVG (generate-covers)

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

  // Admin
  const hash = await bcrypt.hash(env.seed.adminPassword, 12);
  await conn.query('INSERT INTO users (username, email, password_hash, role, bio) VALUES (?,?,?,?,?)',
    [env.seed.adminUsername, env.seed.adminEmail, hash, 'admin', "Lecteur de seinen, chroniqueur manga. J'écris sur ce que les planches laissent dans la mémoire."]);
  const [[admin]] = await conn.query('SELECT id FROM users LIMIT 1');

  // Catégories
  const catId = {};
  for (const c of CATEGORIES) {
    const [r] = await conn.query('INSERT INTO categories (name, slug, color, icon) VALUES (?,?,?,?)', [c.name, c.slug, c.color, c.icon]);
    catId[c.slug] = r.insertId;
  }

  // Mangakas
  const authorIds = [];
  for (const [name, nat, birth, death, bio] of AUTHORS) {
    const [r] = await conn.query('INSERT INTO authors (name, slug, bio, nationality, birth_date, death_date) VALUES (?,?,?,?,?,?)',
      [name, slugify(name), bio, nat, birth || null, death || null]);
    authorIds.push(r.insertId);
  }

  // Tags helper
  const tagId = {};
  async function ensureTag(name) {
    const s = slugify(name); if (tagId[s]) return tagId[s];
    await conn.query('INSERT IGNORE INTO tags (name, slug) VALUES (?,?)', [name, s]);
    const [[t]] = await conn.query('SELECT id FROM tags WHERE slug=?', [s]); tagId[s] = t.id; return t.id;
  }

  // Séries (+ enrichissement Anilist : cover, synopsis, anilist_id)
  const seriesIds = [];
  for (const s of SERIES) {
    const [title, original, ai, year, publisher, volumes, chapters, kind, demo, readStatus, pubStatus, rating, cats, tags, synopsis, aniQuery, explicitId] = s;
    let coverUrl = null; let anilistId = null; let syn = synopsis;
    try {
      const res = explicitId ? await anilist.getMediaById(explicitId) : (await anilist.searchManga(aniQuery, { perPage: 1 }))[0];
      if (res) { coverUrl = res.cover_image_url || null; anilistId = res.anilist_id || null; if (res.synopsis) syn = res.synopsis.slice(0, 600); }
    } catch { /* repli SVG via generate-covers */ }

    const [r] = await conn.query(
      `INSERT INTO books (title, original_title, slug, author_id, cover_image_url, kind, demographic, publication_year,
        publisher, volumes, chapters, synopsis, status, publication_status, rating, source, anilist_id)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [title, original, slugify(title), authorIds[ai], coverUrl, kind, demo, year, publisher, volumes, chapters,
       syn, readStatus, pubStatus, rating, anilistId ? 'anilist' : 'tsundoku', anilistId]
    );
    seriesIds.push(r.insertId);
    for (const cs of cats) await conn.query('INSERT INTO book_categories (book_id, category_id) VALUES (?,?)', [r.insertId, catId[cs]]);
    for (const tg of tags) await conn.query('INSERT INTO book_tags (book_id, tag_id) VALUES (?,?)', [r.insertId, await ensureTag(tg)]);
  }

  // Chroniques
  let dayOffset = 0;
  for (const p of POSTS) {
    const [si, title, excerpt, featured, type, rating, rArt, rStory, rChars, spoil, content] = p;
    const rt = calculateReadingTime(content);
    const publishedAt = new Date(Date.now() - dayOffset * 86400000); dayOffset += 5;
    const [[serie]] = await conn.query('SELECT cover_image_url FROM books WHERE id=?', [seriesIds[si]]);
    const [r] = await conn.query(
      `INSERT INTO posts (user_id, book_id, title, slug, type, excerpt, content, cover_image_url, reading_time,
        rating, rating_art, rating_story, rating_chars, has_spoilers, status, featured, views_count, meta_description, published_at)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?, 'published', ?,?,?,?)`,
      [admin.id, seriesIds[si], title, slugify(title), type, excerpt, content, serie?.cover_image_url || null, rt,
       rating, rArt, rStory, rChars, spoil ? 1 : 0, featured ? 1 : 0,
       Math.floor(Math.random() * 600) + 80, excerpt.slice(0, 160), publishedAt]
    );
    for (const cs of SERIES[si][12]) await conn.query('INSERT IGNORE INTO post_categories (post_id, category_id) VALUES (?,?)', [r.insertId, catId[cs]]);
    for (const tg of SERIES[si][13]) await conn.query('INSERT IGNORE INTO post_tags (post_id, tag_id) VALUES (?,?)', [r.insertId, await ensureTag(tg)]);
  }

  // Citations (gardées en BDD, plus de page dédiée) — quelques répliques
  const QUOTES = [
    [0, "Personne ne peut survivre entièrement seul.", null],
    [1, "Fort ? Que veut dire être fort ?", null],
    [4, "Il n'y a rien de spécial à être en vie.", null],
  ];
  for (const [si, content, page] of QUOTES) {
    await conn.query('INSERT INTO quotes (book_id, content, page_number) VALUES (?,?,?)', [seriesIds[si], content, page]);
  }

  // Timeline de lecture
  const TL = [
    [0, 'en_cours', '2026-05-01', null, 70, "Relecture de l'arc de l'Âge d'Or. Toujours aussi écrasant."],
    [2, 'en_cours', '2026-06-02', null, 55, "Arc de la ferme. Le manga ralentit, et c'est magnifique."],
    [4, 'lu', '2026-03-01', '2026-03-20', 100, "Lu d'une traite. Johan ne me quitte plus."],
    [3, 'lu', '2026-04-10', '2026-04-15', 100, "Punk, drôle, déchirant."],
    [6, 'relu', '2026-02-01', '2026-02-12', 100, "La construction reste un modèle."],
  ];
  for (const [si, st, sd, ed, prog, notes] of TL) {
    await conn.query('INSERT INTO reading_timeline (book_id, status, start_date, end_date, progress, notes, source) VALUES (?,?,?,?,?,?, "manual")',
      [seriesIds[si], st, sd, ed, prog, notes]);
  }

  // Liste thématique
  const [[firstSerie]] = await conn.query('SELECT cover_image_url FROM books WHERE id=?', [seriesIds[0]]);
  const [lr] = await conn.query('INSERT INTO thematic_lists (title, slug, description, cover_image_url) VALUES (?,?,?,?)',
    ['Le seinen qui marque à vie', 'seinen-essentiel',
     "Cinq seinen qui transforment le lecteur : noirceur, beauté et vertige moral.",
     firstSerie?.cover_image_url || null]);
  const listSeries = [0, 1, 4, 5];
  for (let i = 0; i < listSeries.length; i++) {
    await conn.query('INSERT INTO list_books (list_id, book_id, order_in_list) VALUES (?,?,?)', [lr.insertId, seriesIds[listSeries[i]], i]);
  }

  await conn.query("INSERT INTO newsletter_subscribers (email, confirmed) VALUES ('lecteur@exemple.fr', TRUE)");

  // eslint-disable-next-line no-console
  console.log(`✓ Seed manga : ${AUTHORS.length} mangakas, ${SERIES.length} séries, ${POSTS.length} chroniques.`);
  console.log(`  Admin : ${env.seed.adminEmail} / ${env.seed.adminPassword}`);
  await conn.end();
}

main().catch((err) => { console.error('✗ Seed échoué :', err.message); process.exit(1); });
