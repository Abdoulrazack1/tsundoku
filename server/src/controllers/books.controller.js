'use strict';

const asyncHandler = require('../utils/asyncHandler');
const bookModel = require('../models/book.model');
const quoteModel = require('../models/quote.model');
const slugify = require('../utils/slugify');
const { AppError } = require('../middlewares/error.middleware');

const list = asyncHandler(async (req, res) => {
  res.json(await bookModel.list(req.query));
});

const getBySlug = asyncHandler(async (req, res) => {
  const book = await bookModel.getBySlug(req.params.slug);
  if (!book) throw new AppError('Livre introuvable.', 404);
  const [quotes, similar] = await Promise.all([
    quoteModel.listByBook(book.id),
    bookModel.getSimilar(book),
  ]);
  res.json({ book, quotes, similar });
});

const create = asyncHandler(async (req, res) => {
  const data = { ...req.body };
  data.slug = slugify(data.slug || data.title) || `livre-${Date.now()}`;
  const book = await bookModel.create(data);
  res.status(201).json({ book });
});

const update = asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  if (!(await bookModel.getById(id))) throw new AppError('Livre introuvable.', 404);
  const data = { ...req.body };
  if (data.slug) data.slug = slugify(data.slug);
  res.json({ book: await bookModel.update(id, data) });
});

const remove = asyncHandler(async (req, res) => {
  const ok = await bookModel.remove(Number(req.params.id));
  if (!ok) throw new AppError('Livre introuvable.', 404);
  res.json({ message: 'Livre supprimé.' });
});

/* --- Assets : couvertures de tomes/chapitres, planches, illustrations --- */
const listAssets = asyncHandler(async (req, res) => {
  res.json({ assets: await bookModel.listAssets(Number(req.params.id), req.query.type) });
});

const addAsset = asyncHandler(async (req, res) => {
  if (!(await bookModel.getById(Number(req.params.id)))) throw new AppError('Série introuvable.', 404);
  res.status(201).json({ asset: await bookModel.addAsset(Number(req.params.id), req.body) });
});

const removeAsset = asyncHandler(async (req, res) => {
  const ok = await bookModel.removeAsset(Number(req.params.assetId));
  if (!ok) throw new AppError('Asset introuvable.', 404);
  res.json({ message: 'Asset supprimé.' });
});

module.exports = { list, getBySlug, create, update, remove, listAssets, addAsset, removeAsset };
