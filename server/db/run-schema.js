'use strict';

/* Crée la base si nécessaire puis exécute schema.sql. */
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
const env = require('../src/config/env');

async function main() {
  const sql = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');

  const conn = await mysql.createConnection({
    host: env.db.host,
    port: env.db.port,
    user: env.db.user,
    password: env.db.password,
    multipleStatements: true,
  });

  await conn.query(
    `CREATE DATABASE IF NOT EXISTS \`${env.db.name}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
  );
  await conn.query(`USE \`${env.db.name}\``);
  await conn.query(sql);

  // eslint-disable-next-line no-console
  console.log(`✓ Schéma appliqué à la base "${env.db.name}".`);
  await conn.end();
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('✗ Échec du schéma :', err.message);
  process.exit(1);
});
