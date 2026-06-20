'use strict';

const { pool, queryOne } = require('../config/database');

async function list() {
  const [rows] = await pool.query(
    `SELECT a.*, COUNT(b.id) AS books_count
     FROM authors a LEFT JOIN books b ON b.author_id = a.id
     GROUP BY a.id ORDER BY a.name ASC`
  );
  return rows;
}

async function getBySlug(slug) {
  return queryOne('SELECT * FROM authors WHERE slug = :slug', { slug });
}

async function getById(id) {
  return queryOne('SELECT * FROM authors WHERE id = :id', { id });
}

const slugify = require('../utils/slugify');

/** Retourne l'id d'un auteur (le crée s'il n'existe pas). */
async function ensureByName(name) {
  if (!name) return null;
  const existing = await queryOne('SELECT id FROM authors WHERE name = :name', { name });
  if (existing) return existing.id;
  let slug = slugify(name) || `auteur-${Date.now()}`;
  // unicité du slug
  if (await queryOne('SELECT id FROM authors WHERE slug = :slug', { slug })) slug = `${slug}-${Date.now().toString(36)}`;
  const [res] = await pool.query('INSERT INTO authors (name, slug) VALUES (?, ?)', [name, slug]);
  return res.insertId;
}

async function create(data) {
  const [res] = await pool.query(
    `INSERT INTO authors (name, slug, bio, image_url, nationality, birth_date, death_date)
     VALUES (?,?,?,?,?,?,?)`,
    [data.name, data.slug, data.bio || null, data.image_url || null, data.nationality || null,
     data.birth_date || null, data.death_date || null]
  );
  return getById(res.insertId);
}

async function update(id, data) {
  const cols = ['name', 'slug', 'bio', 'image_url', 'nationality', 'birth_date', 'death_date'];
  const fields = [];
  const params = [];
  cols.forEach((c) => { if (data[c] !== undefined) { fields.push(`${c} = ?`); params.push(data[c] || null); } });
  if (fields.length) await pool.query(`UPDATE authors SET ${fields.join(', ')} WHERE id = ?`, [...params, id]);
  return getById(id);
}

async function remove(id) {
  const [res] = await pool.query('DELETE FROM authors WHERE id = ?', [id]);
  return res.affectedRows > 0;
}

/** Stats agrégées d'un auteur (nb livres lus, note moyenne). */
async function stats(authorId) {
  return queryOne(
    `SELECT COUNT(*) AS total_books,
            SUM(status='lu' OR status='relu') AS read_books,
            ROUND(AVG(rating),2) AS avg_rating
     FROM books WHERE author_id = :id`,
    { id: authorId }
  );
}

module.exports = { list, getBySlug, getById, create, update, remove, stats, ensureByName };
