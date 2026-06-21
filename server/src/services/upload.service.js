'use strict';

const path = require('path');
const fs = require('fs');
const multer = require('multer');
const env = require('../config/env');

// Conservé pour compat (anciens médias éventuels sur disque en local).
const uploadDir = path.join(__dirname, '..', '..', '..', 'client', 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

// Stockage EN MÉMOIRE : on récupère req.file.buffer pour le persister en base
// (indispensable sur un hébergement à disque éphémère comme Render free).
const storage = multer.memoryStorage();

const ALLOWED = ['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/gif', 'image/svg+xml'];

const upload = multer({
  storage,
  limits: { fileSize: env.uploadMaxSize },
  fileFilter: (req, file, cb) => {
    if (ALLOWED.includes(file.mimetype)) return cb(null, true);
    cb(new Error('Format de fichier non autorisé.'));
  },
});

module.exports = { upload, uploadDir };
