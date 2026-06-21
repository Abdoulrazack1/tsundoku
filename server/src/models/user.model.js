'use strict';

const { pool, queryOne } = require('../config/database');

async function findByEmail(email) {
  return queryOne('SELECT * FROM users WHERE email = :email', { email });
}

async function findByUsername(username) {
  return queryOne('SELECT * FROM users WHERE username = :username', { username });
}

async function findById(id) {
  return queryOne('SELECT id, username, email, role, avatar_url, bio, created_at FROM users WHERE id = :id', { id });
}

async function create({ username, email, passwordHash, role = 'admin', bio = null }) {
  const [res] = await pool.query(
    'INSERT INTO users (username, email, password_hash, role, bio) VALUES (?,?,?,?,?)',
    [username, email, passwordHash, role, bio]
  );
  return findById(res.insertId);
}

module.exports = { findByEmail, findByUsername, findById, create };
