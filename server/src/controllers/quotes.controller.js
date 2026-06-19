'use strict';

const asyncHandler = require('../utils/asyncHandler');
const quoteModel = require('../models/quote.model');
const { AppError } = require('../middlewares/error.middleware');

const list = asyncHandler(async (req, res) => {
  res.json({ quotes: await quoteModel.list({ book_id: req.query.book_id }) });
});

const random = asyncHandler(async (req, res) => {
  res.json({ quote: await quoteModel.random() });
});

const create = asyncHandler(async (req, res) => {
  res.status(201).json({ quote: await quoteModel.create(req.body) });
});

const remove = asyncHandler(async (req, res) => {
  const ok = await quoteModel.remove(Number(req.params.id));
  if (!ok) throw new AppError('Citation introuvable.', 404);
  res.json({ message: 'Citation supprimée.' });
});

module.exports = { list, random, create, remove };
