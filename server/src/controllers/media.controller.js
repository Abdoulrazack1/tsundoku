'use strict';

const fs = require('fs');
const path = require('path');
const asyncHandler = require('../utils/asyncHandler');
const { uploadDir } = require('../services/upload.service');
const { AppError } = require('../middlewares/error.middleware');

const upload = asyncHandler(async (req, res) => {
  if (!req.file) throw new AppError('Aucun fichier reçu.', 400);
  const url = `/uploads/${req.file.filename}`;
  res.status(201).json({ url, filename: req.file.filename, size: req.file.size });
});

const remove = asyncHandler(async (req, res) => {
  const safe = path.basename(req.params.filename); // empêche le path traversal
  const filePath = path.join(uploadDir, safe);
  if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  res.json({ message: 'Fichier supprimé.' });
});

module.exports = { upload, remove };
