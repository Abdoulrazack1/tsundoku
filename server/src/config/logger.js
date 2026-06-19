'use strict';

const path = require('path');
const fs = require('fs');
const winston = require('winston');
const env = require('./env');

const logDir = path.join(__dirname, '..', '..', 'logs');
if (!fs.existsSync(logDir)) fs.mkdirSync(logDir, { recursive: true });

/**
 * Logger Winston structuré (cf. §18.1).
 * - Console colorée et lisible en développement.
 * - Fichiers JSON (error.log + combined.log) en complément.
 */
const logger = winston.createLogger({
  level: env.logLevel,
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'tsundoku-api' },
  transports: [
    new winston.transports.File({ filename: path.join(logDir, 'error.log'), level: 'error', maxsize: 5_242_880, maxFiles: 5 }),
    new winston.transports.File({ filename: path.join(logDir, 'combined.log'), maxsize: 5_242_880, maxFiles: 5 }),
  ],
});

if (!env.isProd) {
  logger.add(
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.printf(({ level, message, timestamp, stack }) => `${timestamp} ${level}: ${stack || message}`)
      ),
    })
  );
}

/** Flux compatible morgan (logs d'accès HTTP). */
logger.stream = { write: (msg) => logger.info(msg.trim()) };

module.exports = logger;
