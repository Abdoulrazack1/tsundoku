'use strict';

const { pool, queryOne } = require('../config/database');

async function list() {
  const [rows] = await pool.query(
    `SELECT c.*,
       (SELECT COUNT(*) FROM post_categories pc WHERE pc.category_id=c.id) AS posts_count,
       (SELECT COUNT(*) FROM book_categories bc WHERE bc.category_id=c.id) AS books_count
     FROM categories c ORDER BY c.name ASC`
  );
  return rows;
}

async function getById(id) {
  return queryOne('SELECT * FROM categories WHERE id = :id', { id });
}

async function create(data) {
  const [res] = await pool.query(
    'INSERT INTO categories (name, slug, color, icon) VALUES (?,?,?,?)',
    [data.name, data.slug, data.color || null, data.icon || null]
  );
  return getById(res.insertId);
}

async function update(id, data) {
  const cols = ['name', 'slug', 'color', 'icon'];
  const fields = [];
  const params = [];
  cols.forEach((c) => { if (data[c] !== undefined) { fields.push(`${c} = ?`); params.push(data[c] || null); } });
  if (fields.length) await pool.query(`UPDATE categories SET ${fields.join(', ')} WHERE id = ?`, [...params, id]);
  return getById(id);
}

async function remove(id) {
  const [res] = await pool.query('DELETE FROM categories WHERE id = ?', [id]);
  return res.affectedRows > 0;
}

module.exports = { list, getById, create, update, remove };
