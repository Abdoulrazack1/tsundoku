'use strict';

const asyncHandler = require('../utils/asyncHandler');
const tagModel = require('../models/tag.model');
const { AppError } = require('../middlewares/error.middleware');

const list = asyncHandler(async (req, res) => {
  res.json({ tags: await tagModel.list() });
});

const create = asyncHandler(async (req, res) => {
  res.status(201).json({ tag: await tagModel.create(req.body.name) });
});

const remove = asyncHandler(async (req, res) => {
  const ok = await tagModel.remove(Number(req.params.id));
  if (!ok) throw new AppError('Tag introuvable.', 404);
  res.json({ message: 'Tag supprimé.' });
});

module.exports = { list, create, remove };
