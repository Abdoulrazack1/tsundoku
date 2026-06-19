'use strict';

const asyncHandler = require('../utils/asyncHandler');
const categoryModel = require('../models/category.model');
const slugify = require('../utils/slugify');
const { AppError } = require('../middlewares/error.middleware');

const list = asyncHandler(async (req, res) => {
  res.json({ categories: await categoryModel.list() });
});

const create = asyncHandler(async (req, res) => {
  const data = { ...req.body };
  data.slug = slugify(data.slug || data.name);
  res.status(201).json({ category: await categoryModel.create(data) });
});

const update = asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  if (!(await categoryModel.getById(id))) throw new AppError('Catégorie introuvable.', 404);
  const data = { ...req.body };
  if (data.slug) data.slug = slugify(data.slug);
  res.json({ category: await categoryModel.update(id, data) });
});

const remove = asyncHandler(async (req, res) => {
  const ok = await categoryModel.remove(Number(req.params.id));
  if (!ok) throw new AppError('Catégorie introuvable.', 404);
  res.json({ message: 'Catégorie supprimée.' });
});

module.exports = { list, create, update, remove };
