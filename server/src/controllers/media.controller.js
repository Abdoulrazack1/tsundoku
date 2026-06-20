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

const list = asyncHandler(async (req, res) => {
  const files = fs.existsSync(uploadDir) ? fs.readdirSync(uploadDir) : [];
  const items = files
    .filter((f) => /\.(jpe?g|png|webp|avif|gif|svg)$/i.test(f))
    .map((f) => { const st = fs.statSync(path.join(uploadDir, f)); return { filename: f, url: `/uploads/${f}`, size: st.size, mtime: st.mtimeMs }; })
    .sort((a, b) => b.mtime - a.mtime);
  res.json({ media: items });
});

const remove = asyncHandler(async (req, res) => {
  const safe = path.basename(req.params.filename); // empêche le path traversal
  const filePath = path.join(uploadDir, safe);
  if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  res.json({ message: 'Fichier supprimé.' });
});

/**
 * Proxy d'image : rapatrie une image externe (Anilist, MangaDex…) en same-origin
 * pour permettre son usage comme texture WebGL (sinon bloquée par CORS) et éviter
 * le canvas "tainted". Réservé aux images.
 */
const proxy = asyncHandler(async (req, res) => {
  const u = req.query.u;
  if (!u || !/^https?:\/\//i.test(u)) throw new AppError('URL invalide.', 400);
  let upstream;
  try {
    upstream = await fetch(u, { headers: { 'User-Agent': 'Tsundoku/1.0' } });
  } catch {
    throw new AppError('Image inaccessible.', 502);
  }
  const type = upstream.headers.get('content-type') || '';
  if (!upstream.ok || !type.startsWith('image/')) throw new AppError('Ressource non valide.', 502);
  res.set('Content-Type', type);
  res.set('Cache-Control', 'public, max-age=604800');
  res.set('Access-Control-Allow-Origin', '*');
  res.send(Buffer.from(await upstream.arrayBuffer()));
});

module.exports = { upload, list, remove, proxy };
