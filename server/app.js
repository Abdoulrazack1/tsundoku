'use strict';

const path = require('path');
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const compression = require('compression');
const cookieParser = require('cookie-parser');
const morgan = require('morgan');

const env = require('./src/config/env');
const logger = require('./src/config/logger');
const corsOptions = require('./src/config/cors');
const apiRoutes = require('./src/routes');
const feed = require('./src/controllers/feed.controller');
const { apiLimiter } = require('./src/middlewares/rateLimit.middleware');
const { notFound, errorHandler } = require('./src/middlewares/error.middleware');

const app = express();
app.set('trust proxy', 1);

// --- Sécurité & perf (cf. §10, §13) -------------------------------------
app.use(
  helmet({
    contentSecurityPolicy: false, // CDNs (GSAP/Three/Chart/Editor.js) + couvertures externes — à durcir en prod
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })
);
app.use(compression());
app.use(cors(corsOptions));
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(morgan(env.isProd ? 'combined' : 'dev', { stream: logger.stream }));

// --- Fichiers SEO dynamiques (§17, §23) ---------------------------------
app.get('/rss.xml', feed.rss);
app.get('/sitemap.xml', feed.sitemap);
app.get('/robots.txt', feed.robots);

// --- API ----------------------------------------------------------------
app.use('/api', apiLimiter, apiRoutes);

// --- Front statique (mono-serveur sous Laragon) -------------------------
const clientDir = path.join(__dirname, '..', 'client');
app.use('/assets', express.static(path.join(clientDir, 'assets'), { maxAge: env.isProd ? '7d' : 0 }));
app.use('/uploads', express.static(path.join(clientDir, 'uploads')));
app.use(express.static(path.join(clientDir, 'public'), { extensions: ['html'] }));

// 404 API + page 404 front
app.use(notFound);
app.use((req, res, next) => {
  if (req.method === 'GET' && !req.path.startsWith('/api')) {
    return res.status(404).sendFile(path.join(clientDir, 'public', '404.html'));
  }
  return next();
});

app.use(errorHandler);

module.exports = app;
