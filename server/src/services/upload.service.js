'use strict';

const path = require('path');
const fs = require('fs');
const multer = require('multer');
const crypto = require('crypto');
const env = require('../config/env');

const uploadDir = path.join(__dirname, '..', '..', '..', 'client', 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const name = `${Date.now()}-${crypto.randomBytes(6).toString('hex')}${ext}`;
    cb(null, name);
  },
});

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
