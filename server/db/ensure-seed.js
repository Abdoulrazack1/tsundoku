'use strict';

/* Démarrage conteneur : s'assure que la base est amorcée (admin + genres)
   UNIQUEMENT si elle est vide — pour ne jamais écraser les données existantes. */
const mysql = require('mysql2/promise');
const env = require('../src/config/env');
const seed = require('./seed');

async function main() {
  let conn;
  for (let i = 0; i < 30; i++) {
    try { conn = await mysql.createConnection({ host: env.db.host, port: env.db.port, user: env.db.user, password: env.db.password, database: env.db.name }); break; }
    catch { await new Promise((r) => setTimeout(r, 2000)); }
  }
  if (!conn) { console.error('[ensure-seed] BDD injoignable.'); return; }
  try {
    const [[r]] = await conn.query('SELECT COUNT(*) AS n FROM users');
    await conn.end();
    if (r.n > 0) { console.log('[ensure-seed] Base déjà amorcée — rien à faire.'); return; }
  } catch {
    await conn.end().catch(() => {});
    console.log('[ensure-seed] Tables absentes — amorçage…');
  }
  await seed();
}

main().catch((e) => { console.error('[ensure-seed]', e.message); });
