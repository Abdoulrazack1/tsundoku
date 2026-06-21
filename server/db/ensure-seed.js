'use strict';

/* Amorçage de démarrage (conteneur / PaaS) — idempotent et sûr :
   1. attend que la base réponde ;
   2. applique le schéma SI les tables sont absentes (base managée vierge) ;
   3. amorce (admin + genres) SI la table users est vide.
   Ne supprime jamais de données existantes. Compatible bases TLS (DB_SSL=true). */

const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
const env = require('../src/config/env');
const seed = require('./seed');

const sslOpt = env.db.ssl ? { ssl: { rejectUnauthorized: false } } : {};

async function connect() {
  for (let i = 0; i < 30; i++) {
    try {
      return await mysql.createConnection({
        host: env.db.host, port: env.db.port, user: env.db.user,
        password: env.db.password, database: env.db.name,
        multipleStatements: true, ...sslOpt,
      });
    } catch (e) {
      process.stdout.write(`[ensure-seed] BDD pas prête (${i + 1}/30) : ${e.code || e.message}\n`);
      await new Promise((r) => setTimeout(r, 2000));
    }
  }
  return null;
}

async function tablesPresent(conn) {
  try { await conn.query('SELECT 1 FROM users LIMIT 1'); return true; }
  catch { return false; }
}

async function main() {
  const conn = await connect();
  if (!conn) { console.error('[ensure-seed] Base injoignable — démarrage quand même.'); return; }
  try {
    if (!(await tablesPresent(conn))) {
      console.log('[ensure-seed] Tables absentes — application du schéma…');
      const sql = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
      await conn.query(sql); // schema.sql ne contient ni CREATE DATABASE ni USE
      console.log('[ensure-seed] Schéma appliqué.');
    }
    const [[r]] = await conn.query('SELECT COUNT(*) AS n FROM users');
    await conn.end();
    if (r.n > 0) { console.log('[ensure-seed] Base déjà amorcée — rien à faire.'); return; }
  } catch (e) {
    await conn.end().catch(() => {});
    console.error('[ensure-seed] Erreur préparation :', e.message);
    return;
  }
  console.log('[ensure-seed] Amorçage (admin + genres)…');
  await seed();
  console.log('[ensure-seed] Terminé.');
}

main().catch((e) => { console.error('[ensure-seed]', e.message); });
