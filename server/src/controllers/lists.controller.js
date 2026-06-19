'use strict';

const asyncHandler = require('../utils/asyncHandler');
const listModel = require('../models/list.model');
const slugify = require('../utils/slugify');
const { AppError } = require('../middlewares/error.middleware');

const list = asyncHandler(async (req, res) => {
  res.json({ lists: await listModel.list() });
});

const getBySlug = asyncHandler(async (req, res) => {
  const lst = await listModel.getBySlug(req.params.slug);
  if (!lst) throw new AppError('Liste introuvable.', 404);
  res.json({ list: lst });
});

const create = asyncHandler(async (req, res) => {
  const data = { ...req.body };
  data.slug = slugify(data.slug || data.title) || `liste-${Date.now()}`;
  res.status(201).json({ list: await listModel.create(data) });
});

const remove = asyncHandler(async (req, res) => {
  const ok = await listModel.remove(Number(req.params.id));
  if (!ok) throw new AppError('Liste introuvable.', 404);
  res.json({ message: 'Liste supprimée.' });
});

module.exports = { list, getBySlug, create, remove };
