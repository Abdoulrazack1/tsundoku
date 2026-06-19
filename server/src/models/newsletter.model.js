'use strict';

const crypto = require('crypto');
const { pool, queryOne } = require('../config/database');

async function findByEmail(email) {
  return queryOne('SELECT * FROM newsletter_subscribers WHERE email = :email', { email });
}

async function subscribe(email) {
  const token = crypto.randomBytes(24).toString('hex');
  await pool.query(
    `INSERT INTO newsletter_subscribers (email, confirm_token) VALUES (?, ?)
     ON DUPLICATE KEY UPDATE unsubscribed_at = NULL`,
    [email, token]
  );
  return findByEmail(email);
}

async function confirm(token) {
  const [res] = await pool.query(
    'UPDATE newsletter_subscribers SET confirmed = TRUE, confirm_token = NULL WHERE confirm_token = ?',
    [token]
  );
  return res.affectedRows > 0;
}

async function unsubscribe(email) {
  const [res] = await pool.query(
    'UPDATE newsletter_subscribers SET unsubscribed_at = NOW() WHERE email = ?',
    [email]
  );
  return res.affectedRows > 0;
}

async function list() {
  const [rows] = await pool.query('SELECT id, email, confirmed, subscribed_at, unsubscribed_at FROM newsletter_subscribers ORDER BY subscribed_at DESC');
  return rows;
}

async function count() {
  const row = await queryOne('SELECT COUNT(*) AS total FROM newsletter_subscribers WHERE unsubscribed_at IS NULL');
  return row.total;
}

module.exports = { findByEmail, subscribe, confirm, unsubscribe, list, count };
