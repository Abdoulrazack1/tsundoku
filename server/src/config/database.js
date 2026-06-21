'use strict';

const mysql = require('mysql2/promise');
const env = require('./env');

/**
 * Pool de connexions MySQL (mysql2). Requêtes préparées par défaut
 * (protection contre l'injection SQL — cf. §10.3 du cahier des charges).
 */
const pool = mysql.createPool({
  host: env.db.host,
  port: env.db.port,
  user: env.db.user,
  password: env.db.password,
  database: env.db.name,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  charset: 'utf8mb4',
  dateStrings: true,
  namedPlaceholders: true,
  enableKeepAlive: true,
  keepAliveInitialDelay: 10000,
  ...(env.db.ssl ? { ssl: { rejectUnauthorized: false } } : {}),
});

// Bases managées (Aiven, TiDB…) ferment les connexions inactives : on capture
// l'erreur du pool pour ne pas faire planter le process (il en recrée une au besoin).
pool.on('error', (err) => {
  // eslint-disable-next-line no-console
  console.error('[db pool]', err && err.code ? err.code : err.message);
});

/** Helper : exécute une requête et retourne directement les lignes. */
async function query(sql, params = {}) {
  const [rows] = await pool.execute(sql, params);
  return rows;
}

/** Helper : retourne la première ligne ou null. */
async function queryOne(sql, params = {}) {
  const rows = await query(sql, params);
  return rows[0] || null;
}

async function ping() {
  const conn = await pool.getConnection();
  try {
    await conn.ping();
    return true;
  } finally {
    conn.release();
  }
}

module.exports = { pool, query, queryOne, ping };
