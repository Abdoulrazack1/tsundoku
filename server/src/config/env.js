'use strict';

require('dotenv').config();

/**
 * Validation et centralisation des variables d'environnement.
 * Échoue tôt (fail-fast) si une variable critique manque en production.
 */
const required = ['DB_HOST', 'DB_NAME', 'DB_USER', 'JWT_ACCESS_SECRET', 'JWT_REFRESH_SECRET'];

const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT, 10) || 3000,

  db: {
    host: process.env.DB_HOST || '127.0.0.1',
    port: parseInt(process.env.DB_PORT, 10) || 3306,
    name: process.env.DB_NAME || 'tsundoku',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
  },

  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET || 'dev_access_secret',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'dev_refresh_secret',
    accessExpiry: process.env.JWT_ACCESS_EXPIRY || '15m',
    refreshExpiry: process.env.JWT_REFRESH_EXPIRY || '7d',
  },

  uploadMaxSize: parseInt(process.env.UPLOAD_MAX_SIZE, 10) || 5 * 1024 * 1024,
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  logLevel: process.env.LOG_LEVEL || 'info',
  inkoBase: process.env.INKO_BASE || 'http://127.0.0.1:8088/api',

  seed: {
    adminEmail: process.env.SEED_ADMIN_EMAIL || 'admin@tsundoku.app',
    adminUsername: process.env.SEED_ADMIN_USERNAME || 'admin',
    adminPassword: process.env.SEED_ADMIN_PASSWORD || 'changeme',
  },
};

const isProd = env.nodeEnv === 'production';
const missing = required.filter((key) => !process.env[key]);
if (isProd && missing.length) {
  // eslint-disable-next-line no-console
  console.error(`[env] Variables manquantes en production : ${missing.join(', ')}`);
  process.exit(1);
}

env.isProd = isProd;
module.exports = env;
