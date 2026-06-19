'use strict';

const asyncHandler = require('../utils/asyncHandler');
const anilistService = require('../services/anilist.service');
const inkoService = require('../services/inko.service');
const env = require('../config/env');
const { AppError } = require('../middlewares/error.middleware');

/* ---- Liste Anilist de l'utilisateur (son classement public) ---- */
const anilistUser = asyncHandler(async (req, res) => {
  const name = (req.query.name || env.anilistUser || '').trim();
  if (!name) return res.json({ configured: false, entries: [] });
  const data = await anilistService.getUserList(name);
  res.json({ configured: true, username: name, ...data });
});

/* ---- Anilist (métadonnées riches : genres, format, staff) ---- */
const searchAnilist = asyncHandler(async (req, res) => {
  const q = (req.query.q || '').trim();
  if (!q) throw new AppError('Paramètre "q" requis.', 400);
  res.json({ results: await anilistService.searchManga(q) });
});

/* ---- Inko (recherche, couvertures, chapitres, planches) ---- */
const searchInko = asyncHandler(async (req, res) => {
  const q = (req.query.q || '').trim();
  if (!q) throw new AppError('Paramètre "q" requis.', 400);
  res.json({ results: await inkoService.search(q, { source: req.query.source }) });
});

const inkoManga = asyncHandler(async (req, res) => {
  res.json({ manga: await inkoService.getManga(req.params.id, req.query.source) });
});

const inkoChapters = asyncHandler(async (req, res) => {
  res.json({ chapters: await inkoService.getChapters(req.params.id, req.query.source) });
});

const inkoPages = asyncHandler(async (req, res) => {
  res.json({ pages: await inkoService.getPages(req.params.id, req.query.source) });
});

const inkoHealth = asyncHandler(async (req, res) => {
  res.json({ up: await inkoService.health() });
});

const syncAnilist = asyncHandler(async (req, res) => {
  res.json({ message: 'Recherche & import Anilist à l\'unité opérationnels.', imported: 0 });
});
const syncInko = asyncHandler(async (req, res) => {
  const up = await inkoService.health();
  res.json({ message: up ? 'Inko connecté. Recherche & import opérationnels.' : 'Inko hors ligne.', up });
});

module.exports = { searchAnilist, anilistUser, searchInko, inkoManga, inkoChapters, inkoPages, inkoHealth, syncAnilist, syncInko };
