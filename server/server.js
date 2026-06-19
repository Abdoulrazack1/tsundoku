'use strict';

const app = require('./app');
const env = require('./src/config/env');
const logger = require('./src/config/logger');
const { ping, pool } = require('./src/config/database');

async function start() {
  try {
    await ping();
    logger.info('[db] Connexion MySQL établie.');
  } catch (err) {
    logger.error(`[db] Connexion MySQL impossible : ${err.message}`);
    logger.error('→ Vérifiez que MySQL (Laragon) est démarré et que la base "tsundoku" existe (npm run db:reset).');
  }

  const server = app.listen(env.port, () => {
    logger.info(`✦ Tsundoku — serveur prêt sur http://localhost:${env.port} (${env.nodeEnv})`);
  });

  const shutdown = (signal) => {
    logger.info(`[server] ${signal} reçu, arrêt en cours…`);
    server.close(async () => {
      await pool.end().catch(() => {});
      process.exit(0);
    });
  };
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

start();
