'use strict';

const { pool, queryOne } = require('../config/database');
const slugify = require('../utils/slugify');

async function list() {
  const [rows] = await pool.query(
    `SELECT t.*,
       (SELECT COUNT(*) FROM post_tags pt WHERE pt.tag_id=t.id) AS posts_count,
       (SELECT COUNT(*) FROM book_tags bt WHERE bt.tag_id=t.id) AS books_count
     FROM tags t ORDER BY t.name ASC`
  );
  return rows;
}

async function create(name) {
  const slug = slugify(name);
  await pool.query('INSERT IGNORE INTO tags (name, slug) VALUES (?, ?)', [name.trim(), slug]);
  return queryOne('SELECT * FROM tags WHERE slug = :slug', { slug });
}

async function remove(id) {
  const [res] = await pool.query('DELETE FROM tags WHERE id = ?', [id]);
  return res.affectedRows > 0;
}

module.exports = { list, create, remove };
