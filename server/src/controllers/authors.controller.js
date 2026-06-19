'use strict';

const asyncHandler = require('../utils/asyncHandler');
const authorModel = require('../models/author.model');
const bookModel = require('../models/book.model');
const postModel = require('../models/post.model');
const slugify = require('../utils/slugify');
const { AppError } = require('../middlewares/error.middleware');

const list = asyncHandler(async (req, res) => {
  res.json({ authors: await authorModel.list() });
});

const getBySlug = asyncHandler(async (req, res) => {
  const author = await authorModel.getBySlug(req.params.slug);
  if (!author) throw new AppError('Auteur introuvable.', 404);
  const [books, stats] = await Promise.all([
    bookModel.listByAuthor(author.id),
    authorModel.stats(author.id),
  ]);
  // Chroniques liées : articles dont le livre appartient à cet auteur.
  const related = await postModel.list({ limit: 50, status: 'published' });
  const relatedPosts = related.posts.filter((p) => p.book?.author?.id === author.id);
  res.json({ author, books, stats, posts: relatedPosts });
});

const create = asyncHandler(async (req, res) => {
  const data = { ...req.body };
  data.slug = slugify(data.slug || data.name) || `auteur-${Date.now()}`;
  res.status(201).json({ author: await authorModel.create(data) });
});

const update = asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  if (!(await authorModel.getById(id))) throw new AppError('Auteur introuvable.', 404);
  const data = { ...req.body };
  if (data.slug) data.slug = slugify(data.slug);
  res.json({ author: await authorModel.update(id, data) });
});

const remove = asyncHandler(async (req, res) => {
  const ok = await authorModel.remove(Number(req.params.id));
  if (!ok) throw new AppError('Auteur introuvable.', 404);
  res.json({ message: 'Auteur supprimé.' });
});

module.exports = { list, getBySlug, create, update, remove };
