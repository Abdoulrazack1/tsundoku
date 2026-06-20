'use strict';

const { pool, queryOne } = require('../config/database');

/** Commentaires approuvés d'un article (avec 1 niveau de réponses). */
async function listForPost(postId) {
  const [rows] = await pool.query(
    `SELECT id, parent_id, author_name, content, created_at
     FROM comments WHERE post_id = ? AND approved = TRUE
     ORDER BY created_at ASC`,
    [postId]
  );
  const roots = rows.filter((r) => !r.parent_id);
  const byParent = {};
  rows.filter((r) => r.parent_id).forEach((r) => { (byParent[r.parent_id] ||= []).push(r); });
  return roots.map((r) => ({ ...r, replies: byParent[r.id] || [] }));
}

async function create({ post_id, parent_id = null, author_name, content, ip_hash }) {
  const [res] = await pool.query(
    'INSERT INTO comments (post_id, parent_id, author_name, content, ip_hash) VALUES (?,?,?,?,?)',
    [post_id, parent_id, author_name, content, ip_hash || null]
  );
  return queryOne('SELECT id, post_id, parent_id, author_name, content, approved, created_at FROM comments WHERE id = :id', { id: res.insertId });
}

/** Liste admin (modération). */
async function listAll({ status = 'all' } = {}) {
  let where = '';
  if (status === 'pending') where = 'WHERE c.approved = FALSE';
  else if (status === 'approved') where = 'WHERE c.approved = TRUE';
  const [rows] = await pool.query(
    `SELECT c.id, c.post_id, c.author_name, c.content, c.approved, c.created_at,
            p.title AS post_title, p.slug AS post_slug
     FROM comments c JOIN posts p ON c.post_id = p.id
     ${where} ORDER BY c.created_at DESC LIMIT 200`
  );
  return rows;
}

async function approve(id) {
  const [res] = await pool.query('UPDATE comments SET approved = TRUE WHERE id = ?', [id]);
  return res.affectedRows > 0;
}

async function remove(id) {
  const [res] = await pool.query('DELETE FROM comments WHERE id = ?', [id]);
  return res.affectedRows > 0;
}

async function countPending() {
  const r = await queryOne('SELECT COUNT(*) AS n FROM comments WHERE approved = FALSE');
  return r.n;
}

module.exports = { listForPost, create, listAll, approve, remove, countPending };
