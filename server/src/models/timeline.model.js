'use strict';

const { pool } = require('../config/database');

const COLUMNS = `
  rt.id, rt.status, rt.start_date, rt.end_date, rt.notes, rt.progress, rt.source, rt.created_at,
  b.id AS book_id, b.title AS book_title, b.slug AS book_slug, b.cover_image_url AS book_cover,
  b.pages AS book_pages,
  a.id AS author_id, a.name AS author_name, a.slug AS author_slug
`;

function shape(row) {
  return {
    id: row.id,
    status: row.status,
    start_date: row.start_date,
    end_date: row.end_date,
    notes: row.notes,
    progress: row.progress,
    source: row.source,
    created_at: row.created_at,
    book: {
      id: row.book_id, title: row.book_title, slug: row.book_slug,
      cover_image_url: row.book_cover, pages: row.book_pages,
      author: row.author_id ? { id: row.author_id, name: row.author_name, slug: row.author_slug } : null,
    },
  };
}

async function list({ status, year } = {}) {
  const where = [];
  const params = [];
  if (status) { where.push('rt.status = ?'); params.push(status); }
  if (year) { where.push('YEAR(COALESCE(rt.end_date, rt.start_date, rt.created_at)) = ?'); params.push(year); }
  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const [rows] = await pool.query(
    `SELECT ${COLUMNS} FROM reading_timeline rt
     JOIN books b ON rt.book_id=b.id LEFT JOIN authors a ON b.author_id=a.id
     ${whereSql} ORDER BY COALESCE(rt.end_date, rt.start_date, rt.created_at) DESC`,
    params
  );
  return rows.map(shape);
}

async function create(data) {
  const [res] = await pool.query(
    `INSERT INTO reading_timeline (book_id, status, start_date, end_date, notes, progress, source)
     VALUES (?,?,?,?,?,?,?)`,
    [data.book_id, data.status, data.start_date || null, data.end_date || null,
     data.notes || null, data.progress ?? null, data.source || 'manual']
  );
  return { id: res.insertId, ...data };
}

async function update(id, data) {
  const cols = ['status', 'start_date', 'end_date', 'notes', 'progress'];
  const fields = [];
  const params = [];
  cols.forEach((c) => { if (data[c] !== undefined) { fields.push(`${c} = ?`); params.push(data[c]); } });
  if (fields.length) await pool.query(`UPDATE reading_timeline SET ${fields.join(', ')} WHERE id = ?`, [...params, id]);
  return { id, ...data };
}

async function remove(id) {
  const [res] = await pool.query('DELETE FROM reading_timeline WHERE id = ?', [id]);
  return res.affectedRows > 0;
}

module.exports = { list, create, update, remove };
