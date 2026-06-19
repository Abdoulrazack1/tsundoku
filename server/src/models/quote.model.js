'use strict';

const { pool, queryOne } = require('../config/database');

const COLUMNS = `
  q.id, q.content, q.page_number, q.created_at,
  b.id AS book_id, b.title AS book_title, b.slug AS book_slug, b.cover_image_url AS book_cover,
  a.id AS author_id, a.name AS author_name, a.slug AS author_slug
`;

function shape(row) {
  if (!row) return null;
  return {
    id: row.id,
    content: row.content,
    page_number: row.page_number,
    created_at: row.created_at,
    book: row.book_id
      ? { id: row.book_id, title: row.book_title, slug: row.book_slug, cover_image_url: row.book_cover,
          author: row.author_id ? { id: row.author_id, name: row.author_name, slug: row.author_slug } : null }
      : null,
  };
}

async function list({ book_id } = {}) {
  const where = book_id ? 'WHERE q.book_id = ?' : '';
  const params = book_id ? [book_id] : [];
  const [rows] = await pool.query(
    `SELECT ${COLUMNS} FROM quotes q
     JOIN books b ON q.book_id=b.id LEFT JOIN authors a ON b.author_id=a.id
     ${where} ORDER BY q.created_at DESC`,
    params
  );
  return rows.map(shape);
}

async function listByBook(bookId) {
  return list({ book_id: bookId });
}

async function random() {
  const row = await queryOne(
    `SELECT ${COLUMNS} FROM quotes q
     JOIN books b ON q.book_id=b.id LEFT JOIN authors a ON b.author_id=a.id
     ORDER BY RAND() LIMIT 1`
  );
  return shape(row);
}

async function create(data) {
  const [res] = await pool.query(
    'INSERT INTO quotes (book_id, content, page_number) VALUES (?,?,?)',
    [data.book_id, data.content, data.page_number || null]
  );
  const row = await queryOne(
    `SELECT ${COLUMNS} FROM quotes q JOIN books b ON q.book_id=b.id LEFT JOIN authors a ON b.author_id=a.id WHERE q.id = :id`,
    { id: res.insertId }
  );
  return shape(row);
}

async function remove(id) {
  const [res] = await pool.query('DELETE FROM quotes WHERE id = ?', [id]);
  return res.affectedRows > 0;
}

module.exports = { list, listByBook, random, create, remove };
