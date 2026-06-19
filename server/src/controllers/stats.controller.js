'use strict';

const asyncHandler = require('../utils/asyncHandler');
const statsModel = require('../models/stats.model');

const publicStats = asyncHandler(async (req, res) => {
  res.json(await statsModel.publicOverview());
});

const adminStats = asyncHandler(async (req, res) => {
  res.json(await statsModel.adminOverview());
});

module.exports = { publicStats, adminStats };
