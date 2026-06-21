'use strict';

const crypto = require('crypto');
const asyncHandler = require('../utils/asyncHandler');
const { pool, query } = require('../config/database');
const { AppError } = require('../middlewares/error.middleware');

const EXT = {
  'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp',
  'image/avif': 'avif', 'image/gif': 'gif', 'image/svg+xml': 'svg',
};

/* Upload : stocke l'image EN BASE (persistant même sur disque éphémère) et
   renvoie une URL stable servie par /api/media/file/:id */
const upload = asyncHandler(async (req, res) => {
  if (!req.file) throw new AppError('Aucun fichier reçu.', 400);
  const ext = EXT[req.file.mimetype] || 'bin';
  const filename = `${Date.now()}-${crypto.randomBytes(5).toString('hex')}.${ext}`;
  const [r] = await pool.query(
    'INSERT INTO media_files (filename, mime_type, size, data) VALUES (?,?,?,?)',
    [filename, req.file.mimetype, req.file.size, req.file.buffer]
  );
  res.status(201).json({ url: `/api/media/file/${r.insertId}`, id: r.insertId, filename, size: req.file.size });
});

/* Service public d'une image stockée en base. */
const serve = asyncHandler(async (req, res) => {
  const id = parseInt(req.params.id, 10); // tolère un suffixe d'extension éventuel
  if (!id) throw new AppError('Identifiant invalide.', 400);
  const [[row]] = await pool.query('SELECT mime_type, data FROM media_files WHERE id = ?', [id]);
  if (!row) throw new AppError('Image introuvable.', 404);
  res.set('Content-Type', row.mime_type);
  res.set('Cache-Control', 'public, max-age=31536000, immutable');
  res.set('Access-Control-Allow-Origin', '*');
  res.send(row.data);
});

const list = asyncHandler(async (req, res) => {
  const rows = await query('SELECT id, filename, mime_type, size, created_at FROM media_files ORDER BY id DESC LIMIT 200');
  res.json({ media: rows.map((m) => ({ ...m, url: `/api/media/file/${m.id}` })) });
});

const remove = asyncHandler(async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (id) await query('DELETE FROM media_files WHERE id = ?', [id]);
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

module.exports = { upload, serve, list, remove, proxy };
