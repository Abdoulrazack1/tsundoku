'use strict';

const crypto = require('crypto');
const asyncHandler = require('../utils/asyncHandler');
const postModel = require('../models/post.model');
const slugify = require('../utils/slugify');
const { calculateReadingTime } = require('../utils/readingTime');
const { sanitizeHtml } = require('../utils/sanitize');
const { AppError } = require('../middlewares/error.middleware');

/** Génère un slug unique à partir d'un titre. */
async function uniqueSlug(title, base, excludeId = null) {
  let slug = slugify(base || title);
  if (!slug) slug = `post-${Date.now()}`;
  let candidate = slug;
  let i = 2;
  while (await postModel.slugExists(candidate, excludeId)) {
    candidate = `${slug}-${i++}`;
  }
  return candidate;
}

const list = asyncHandler(async (req, res) => {
  // Le filtre status n'est utilisable que par un admin authentifié.
  const opts = { ...req.query };
  if (!req.user) opts.status = 'published';
  const result = await postModel.list(opts);
  res.json(result);
});

const featured = asyncHandler(async (req, res) => {
  const post = await postModel.getFeatured();
  if (!post) return res.json({ post: null });
  res.json({ post });
});

const search = asyncHandler(async (req, res) => {
  const q = (req.query.q || '').trim();
  if (!q) return res.json({ posts: [], total: 0 });
  const result = await postModel.list({ q, limit: 12, status: 'published' });
  res.json(result);
});

const getBySlug = asyncHandler(async (req, res) => {
  const post = await postModel.getBySlug(req.params.slug, { includeDrafts: !!req.user });
  if (!post) throw new AppError('Article introuvable.', 404);
  const adjacent = await postModel.getAdjacent(post);
  res.json({ post, adjacent });
});

// Récupération par ID (admin) — contenu complet, brouillons inclus.
const getById = asyncHandler(async (req, res) => {
  const post = await postModel.getById(Number(req.params.id));
  if (!post) throw new AppError('Article introuvable.', 404);
  res.json({ post });
});

const incrementView = asyncHandler(async (req, res) => {
  const post = await postModel.getBySlug(req.params.slug).catch(() => null) || (await postModel.getById(req.params.id).catch(() => null));
  if (!post) throw new AppError('Article introuvable.', 404);
  const ipHash = crypto.createHash('sha256').update(req.ip || '').digest('hex');
  await postModel.incrementViews(post.id, ipHash, req.headers['user-agent']);
  res.json({ ok: true });
});

const create = asyncHandler(async (req, res) => {
  const data = { ...req.body };
  data.content = sanitizeHtml(data.content);
  data.slug = await uniqueSlug(data.title, data.slug);
  data.reading_time = calculateReadingTime(data.content);
  const post = await postModel.create(data, req.user.id);
  res.status(201).json({ post });
});

const update = asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  const existing = await postModel.getById(id);
  if (!existing) throw new AppError('Article introuvable.', 404);
  const data = { ...req.body };
  if (data.content !== undefined) {
    data.content = sanitizeHtml(data.content);
    data.reading_time = calculateReadingTime(data.content);
  }
  if (data.slug) data.slug = await uniqueSlug(data.title || existing.title, data.slug, id);
  const post = await postModel.update(id, data);
  res.json({ post });
});

const updateStatus = asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  const { status } = req.body;
  if (!['draft', 'published', 'archived'].includes(status)) throw new AppError('Statut invalide.', 400);
  const post = await postModel.update(id, { status });
  res.json({ post });
});

const remove = asyncHandler(async (req, res) => {
  const ok = await postModel.remove(Number(req.params.id));
  if (!ok) throw new AppError('Article introuvable.', 404);
  res.json({ message: 'Article supprimé.' });
});

module.exports = { list, featured, search, getBySlug, getById, incrementView, create, update, updateStatus, remove };
