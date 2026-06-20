'use strict';

const crypto = require('crypto');
const asyncHandler = require('../utils/asyncHandler');
const commentModel = require('../models/comment.model');
const postModel = require('../models/post.model');
const { escapeHtml } = require('../utils/sanitize');
const { AppError } = require('../middlewares/error.middleware');

/** Commentaires approuvés d'un article (public, par slug). */
const listForPost = asyncHandler(async (req, res) => {
  const post = await postModel.getBySlug(req.params.slug);
  if (!post) throw new AppError('Article introuvable.', 404);
  res.json({ comments: await commentModel.listForPost(post.id) });
});

/** Dépôt d'un commentaire (public, modéré : en attente d'approbation). */
const create = asyncHandler(async (req, res) => {
  const post = await postModel.getBySlug(req.params.slug);
  if (!post) throw new AppError('Article introuvable.', 404);
  const ipHash = crypto.createHash('sha256').update(req.ip || '').digest('hex');
  await commentModel.create({
    post_id: post.id,
    parent_id: req.body.parent_id || null,
    author_name: escapeHtml(req.body.author_name.trim()),
    content: escapeHtml(req.body.content.trim()),
    ip_hash: ipHash,
  });
  res.status(201).json({ message: 'Merci ! Ton commentaire sera publié après modération.' });
});

/* --- Admin : modération --- */
const listAll = asyncHandler(async (req, res) => {
  res.json({ comments: await commentModel.listAll({ status: req.query.status }) });
});
const approve = asyncHandler(async (req, res) => {
  const ok = await commentModel.approve(Number(req.params.id));
  if (!ok) throw new AppError('Commentaire introuvable.', 404);
  res.json({ message: 'Commentaire approuvé.' });
});
const remove = asyncHandler(async (req, res) => {
  const ok = await commentModel.remove(Number(req.params.id));
  if (!ok) throw new AppError('Commentaire introuvable.', 404);
  res.json({ message: 'Commentaire supprimé.' });
});

module.exports = { listForPost, create, listAll, approve, remove };
