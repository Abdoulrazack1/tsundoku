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

// Filet de sécurité : ne JAMAIS laisser une erreur non capturée tuer le process
// (typiquement une connexion MySQL inactive coupée par une base managée comme Aiven).
// On journalise et on continue — le pool recrée les connexions à la demande.
process.on('unhandledRejection', (reason) => {
  logger.error(`[unhandledRejection] ${reason && reason.stack ? reason.stack : reason}`);
});
process.on('uncaughtException', (err) => {
  logger.error(`[uncaughtException] ${err && err.stack ? err.stack : err}`);
});

start();
