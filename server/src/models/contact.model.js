'use strict';

const { pool } = require('../config/database');

async function create({ name, email, subject, message }) {
  const [res] = await pool.query(
    'INSERT INTO contact_messages (name, email, subject, message) VALUES (?,?,?,?)',
    [name, email, subject || null, message]
  );
  return { id: res.insertId };
}

async function list() {
  const [rows] = await pool.query('SELECT * FROM contact_messages ORDER BY created_at DESC LIMIT 200');
  return rows;
}

async function markRead(id) {
  const [res] = await pool.query('UPDATE contact_messages SET is_read = TRUE WHERE id = ?', [id]);
  return res.affectedRows > 0;
}

async function remove(id) {
  const [res] = await pool.query('DELETE FROM contact_messages WHERE id = ?', [id]);
  return res.affectedRows > 0;
}

async function countUnread() {
  const [[r]] = await pool.query('SELECT COUNT(*) AS n FROM contact_messages WHERE is_read = FALSE');
  return r.n;
}

module.exports = { create, list, markRead, remove, countUnread };
