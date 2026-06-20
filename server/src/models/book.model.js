'use strict';

const { pool, queryOne } = require('../config/database');

const COLUMNS = `
  b.id, b.title, b.original_title, b.slug, b.cover_image_url, b.isbn, b.kind, b.demographic,
  b.publication_year, b.publisher, b.volumes, b.chapters, b.pages, b.language, b.synopsis,
  b.status, b.publication_status, b.rating, b.source, b.anilist_id, b.inko_id, b.inko_source, b.created_at,
  a.id AS author_id, a.name AS author_name, a.slug AS author_slug
`;

function shape(row) {
  if (!row) return null;
  return {
    id: row.id,
    title: row.title,
    original_title: row.original_title,
    slug: row.slug,
    cover_image_url: row.cover_image_url,
    isbn: row.isbn,
    kind: row.kind,
    demographic: row.demographic,
    publication_year: row.publication_year,
    publisher: row.publisher,
    volumes: row.volumes,
    chapters: row.chapters,
    pages: row.pages,
    language: row.language,
    synopsis: row.synopsis,
    status: row.status,
    publication_status: row.publication_status,
    rating: row.rating != null ? Number(row.rating) : null,
    source: row.source,
    anilist_id: row.anilist_id,
    inko_id: row.inko_id,
    inko_source: row.inko_source,
    created_at: row.created_at,
    author: row.author_id ? { id: row.author_id, name: row.author_name, slug: row.author_slug } : null,
    categories: [],
    tags: [],
    assets: [],
  };
}

async function attachTaxonomies(books) {
  if (!books.length) return books;
  const ids = books.map((b) => b.id);
  const ph = ids.map(() => '?').join(',');
  const [cats] = await pool.query(
    `SELECT bc.book_id, c.id, c.name, c.slug, c.color FROM book_categories bc JOIN categories c ON bc.category_id=c.id WHERE bc.book_id IN (${ph})`,
    ids
  );
  const [tags] = await pool.query(
    `SELECT bt.book_id, t.id, t.name, t.slug FROM book_tags bt JOIN tags t ON bt.tag_id=t.id WHERE bt.book_id IN (${ph})`,
    ids
  );
  const byId = Object.fromEntries(books.map((b) => [b.id, b]));
  cats.forEach((c) => byId[c.book_id]?.categories.push({ id: c.id, name: c.name, slug: c.slug, color: c.color }));
  tags.forEach((t) => byId[t.book_id]?.tags.push({ id: t.id, name: t.name, slug: t.slug }));
  return books;
}

const SORTS = {
  newest: 'b.created_at DESC',
  title: 'b.title ASC',
  author: 'a.name ASC',
  top_rated: 'b.rating DESC',
};

async function list(opts = {}) {
  const { status, source, category, author, sort = 'newest', q, page = 1, limit = 24 } = opts;
  const where = [];
  const params = [];
  if (status) { where.push('b.status = ?'); params.push(status); }
  if (source) { where.push('b.source = ?'); params.push(source); }
  if (author) { where.push('a.slug = ?'); params.push(author); }
  if (q) { where.push('(b.title LIKE ? OR a.name LIKE ?)'); params.push(`%${q}%`, `%${q}%`); }
  if (category) {
    where.push('b.id IN (SELECT bc.book_id FROM book_categories bc JOIN categories c ON bc.category_id=c.id WHERE c.slug = ?)');
    params.push(category);
  }
  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const order = SORTS[sort] || SORTS.newest;
  const offset = (page - 1) * limit;

  const [countRows] = await pool.query(`SELECT COUNT(*) AS total FROM books b LEFT JOIN authors a ON b.author_id=a.id ${whereSql}`, params);
  const [rows] = await pool.query(
    `SELECT ${COLUMNS} FROM books b LEFT JOIN authors a ON b.author_id=a.id ${whereSql} ORDER BY ${order} LIMIT ? OFFSET ?`,
    [...params, Number(limit), Number(offset)]
  );
  const books = await attachTaxonomies(rows.map(shape));
  return { books, total: countRows[0].total, page: Number(page), limit: Number(limit), pages: Math.ceil(countRows[0].total / limit) };
}

async function attachAssets(book) {
  if (!book) return book;
  const [rows] = await pool.query(
    'SELECT id, type, label, image_url, position FROM series_assets WHERE book_id = ? ORDER BY type, position, id',
    [book.id]
  );
  book.assets = rows;
  return book;
}

async function findByExternal({ anilist_id, inko_id }) {
  if (anilist_id) { const r = await queryOne('SELECT id FROM books WHERE anilist_id = :id', { id: anilist_id }); if (r) return getById(r.id); }
  if (inko_id) { const r = await queryOne('SELECT id FROM books WHERE inko_id = :id', { id: inko_id }); if (r) return getById(r.id); }
  return null;
}

async function uniqueSlug(base) {
  const slugify = require('../utils/slugify');
  let slug = slugify(base) || `serie-${Date.now()}`;
  let candidate = slug; let i = 2;
  while (await queryOne('SELECT id FROM books WHERE slug = :slug', { slug: candidate })) candidate = `${slug}-${i++}`;
  return candidate;
}

async function getBySlug(slug) {
  const row = await queryOne(`SELECT ${COLUMNS} FROM books b LEFT JOIN authors a ON b.author_id=a.id WHERE b.slug = :slug`, { slug });
  if (!row) return null;
  const book = (await attachTaxonomies([shape(row)]))[0];
  return attachAssets(book);
}

async function getById(id) {
  const row = await queryOne(`SELECT ${COLUMNS} FROM books b LEFT JOIN authors a ON b.author_id=a.id WHERE b.id = :id`, { id });
  if (!row) return null;
  const book = (await attachTaxonomies([shape(row)]))[0];
  return attachAssets(book);
}

/* --- Assets (couvertures de tomes/chapitres, planches, illustrations) --- */
async function listAssets(bookId, type) {
  const where = type ? 'WHERE book_id = ? AND type = ?' : 'WHERE book_id = ?';
  const params = type ? [bookId, type] : [bookId];
  const [rows] = await pool.query(`SELECT id, type, label, image_url, position FROM series_assets ${where} ORDER BY type, position, id`, params);
  return rows;
}

async function addAsset(bookId, { type = 'art', label = null, image_url, position = 0 }) {
  const [res] = await pool.query('INSERT INTO series_assets (book_id, type, label, image_url, position) VALUES (?,?,?,?,?)',
    [bookId, type, label, image_url, position]);
  return { id: res.insertId, book_id: bookId, type, label, image_url, position };
}

async function removeAsset(id) {
  const [res] = await pool.query('DELETE FROM series_assets WHERE id = ?', [id]);
  return res.affectedRows > 0;
}

async function listByAuthor(authorId) {
  const [rows] = await pool.query(
    `SELECT ${COLUMNS} FROM books b LEFT JOIN authors a ON b.author_id=a.id WHERE b.author_id = ? ORDER BY b.publication_year DESC`,
    [authorId]
  );
  return attachTaxonomies(rows.map(shape));
}

/** Recommandations : même catégorie ou même auteur, excluant le livre courant. */
async function getSimilar(book, limit = 4) {
  const [rows] = await pool.query(
    `SELECT DISTINCT ${COLUMNS} FROM books b
     LEFT JOIN authors a ON b.author_id=a.id
     LEFT JOIN book_categories bc ON bc.book_id=b.id
     WHERE b.id <> ? AND (b.author_id = ? OR bc.category_id IN
       (SELECT category_id FROM book_categories WHERE book_id = ?))
     ORDER BY b.rating DESC LIMIT ?`,
    [book.id, book.author?.id || 0, book.id, Number(limit)]
  );
  return attachTaxonomies(rows.map(shape));
}

async function setTaxonomies(conn, bookId, categoryIds = [], tagNames = []) {
  await conn.query('DELETE FROM book_categories WHERE book_id = ?', [bookId]);
  await conn.query('DELETE FROM book_tags WHERE book_id = ?', [bookId]);
  if (categoryIds.length) {
    await conn.query('INSERT INTO book_categories (book_id, category_id) VALUES ?', [categoryIds.map((c) => [bookId, c])]);
  }
  const slugify = require('../utils/slugify');
  for (const name of tagNames) {
    const ts = slugify(name);
    if (!ts) continue;
    await conn.query('INSERT IGNORE INTO tags (name, slug) VALUES (?, ?)', [name.trim(), ts]);
    const [[tag]] = await conn.query('SELECT id FROM tags WHERE slug = ?', [ts]);
    if (tag) await conn.query('INSERT IGNORE INTO book_tags (book_id, tag_id) VALUES (?, ?)', [bookId, tag.id]);
  }
}

async function create(data) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [res] = await conn.query(
      `INSERT INTO books (title, original_title, slug, author_id, cover_image_url, isbn, kind, demographic,
        publication_year, publisher, volumes, chapters, pages, language, synopsis, status, publication_status,
        rating, source, anilist_id, inko_id, inko_source)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [data.title, data.original_title || null, data.slug, data.author_id, data.cover_image_url || null, data.isbn || null,
       data.kind || 'manga', data.demographic || 'none', data.publication_year || null, data.publisher || null,
       data.volumes || null, data.chapters || null, data.pages || null, data.language || null,
       data.synopsis || null, data.status, data.publication_status || 'inconnu', data.rating ?? null,
       data.source, data.anilist_id || null, data.inko_id || null, data.inko_source || null]
    );
    await setTaxonomies(conn, res.insertId, data.category_ids, data.tags);
    await conn.commit();
    return getById(res.insertId);
  } catch (e) { await conn.rollback(); throw e; } finally { conn.release(); }
}

async function update(id, data) {
  const cols = ['title', 'original_title', 'slug', 'author_id', 'cover_image_url', 'isbn', 'kind', 'demographic',
    'publication_year', 'publisher', 'volumes', 'chapters', 'pages', 'language', 'synopsis', 'status',
    'publication_status', 'rating', 'source', 'anilist_id', 'inko_id', 'inko_source'];
  const fields = [];
  const params = [];
  cols.forEach((c) => { if (data[c] !== undefined) { fields.push(`${c} = ?`); params.push(data[c]); } });
  if (fields.length) await pool.query(`UPDATE books SET ${fields.join(', ')} WHERE id = ?`, [...params, id]);
  if (data.category_ids !== undefined || data.tags !== undefined) {
    const conn = await pool.getConnection();
    try { await setTaxonomies(conn, id, data.category_ids || [], data.tags || []); } finally { conn.release(); }
  }
  return getById(id);
}

async function remove(id) {
  const [res] = await pool.query('DELETE FROM books WHERE id = ?', [id]);
  return res.affectedRows > 0;
}

module.exports = { list, getBySlug, getById, findByExternal, uniqueSlug, listByAuthor, getSimilar, create, update, remove, shape, listAssets, addAsset, removeAsset };
