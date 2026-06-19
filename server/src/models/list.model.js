'use strict';

const { pool, queryOne } = require('../config/database');

async function list() {
  const [rows] = await pool.query(
    `SELECT l.*, (SELECT COUNT(*) FROM list_books lb WHERE lb.list_id=l.id) AS books_count
     FROM thematic_lists l ORDER BY l.created_at DESC`
  );
  return rows;
}

async function getBySlug(slug) {
  const lst = await queryOne('SELECT * FROM thematic_lists WHERE slug = :slug', { slug });
  if (!lst) return null;
  const [rows] = await pool.query(
    `SELECT b.id, b.title, b.slug, b.cover_image_url, b.rating, b.status, lb.order_in_list,
            a.name AS author_name, a.slug AS author_slug
     FROM list_books lb
     JOIN books b ON lb.book_id=b.id
     LEFT JOIN authors a ON b.author_id=a.id
     WHERE lb.list_id = ? ORDER BY lb.order_in_list ASC, b.title ASC`,
    [lst.id]
  );
  lst.books = rows.map((r) => ({
    id: r.id, title: r.title, slug: r.slug, cover_image_url: r.cover_image_url,
    rating: r.rating != null ? Number(r.rating) : null, status: r.status,
    author: r.author_name ? { name: r.author_name, slug: r.author_slug } : null,
  }));
  return lst;
}

async function getById(id) {
  return queryOne('SELECT * FROM thematic_lists WHERE id = :id', { id });
}

async function create(data) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [res] = await conn.query(
      'INSERT INTO thematic_lists (title, slug, description, cover_image_url) VALUES (?,?,?,?)',
      [data.title, data.slug, data.description || null, data.cover_image_url || null]
    );
    if (data.book_ids?.length) {
      await conn.query(
        'INSERT INTO list_books (list_id, book_id, order_in_list) VALUES ?',
        [data.book_ids.map((bid, i) => [res.insertId, bid, i])]
      );
    }
    await conn.commit();
    return getById(res.insertId);
  } catch (e) { await conn.rollback(); throw e; } finally { conn.release(); }
}

async function remove(id) {
  const [res] = await pool.query('DELETE FROM thematic_lists WHERE id = ?', [id]);
  return res.affectedRows > 0;
}

module.exports = { list, getBySlug, getById, create, remove };
