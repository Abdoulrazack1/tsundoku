'use strict';

const asyncHandler = require('../utils/asyncHandler');
const timelineModel = require('../models/timeline.model');
const { AppError } = require('../middlewares/error.middleware');

const list = asyncHandler(async (req, res) => {
  res.json({ entries: await timelineModel.list(req.query) });
});

const create = asyncHandler(async (req, res) => {
  res.status(201).json({ entry: await timelineModel.create(req.body) });
});

const update = asyncHandler(async (req, res) => {
  res.json({ entry: await timelineModel.update(Number(req.params.id), req.body) });
});

const remove = asyncHandler(async (req, res) => {
  const ok = await timelineModel.remove(Number(req.params.id));
  if (!ok) throw new AppError('Entrée introuvable.', 404);
  res.json({ message: 'Entrée supprimée.' });
});

module.exports = { list, create, update, remove };
