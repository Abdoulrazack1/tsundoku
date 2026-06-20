'use strict';

const asyncHandler = require('../utils/asyncHandler');
const bookModel = require('../models/book.model');
const quoteModel = require('../models/quote.model');
const authorModel = require('../models/author.model');
const categoryModel = require('../models/category.model');
const anilistService = require('../services/anilist.service');
const inkoService = require('../services/inko.service');
const slugify = require('../utils/slugify');
const { AppError } = require('../middlewares/error.middleware');

// Genres Anilist (EN) -> slugs de nos catégories (FR)
const GENRE_MAP = {
  Action: 'action', Adventure: 'aventure', Comedy: 'comedie', Drama: 'drame',
  Fantasy: 'fantastique', Horror: 'horreur', Mystery: 'psychologique', Psychological: 'psychologique',
  Romance: 'romance', 'Sci-Fi': 'science-fiction', 'Slice of Life': 'tranche-de-vie', Sports: 'sport',
  Supernatural: 'fantastique', Thriller: 'psychologique', Historical: 'historique', Mecha: 'science-fiction',
};

async function genresToCategoryIds(genres = []) {
  const cats = await categoryModel.list();
  const bySlug = Object.fromEntries(cats.map((c) => [c.slug, c.id]));
  const ids = new Set();
  genres.forEach((g) => { const slug = GENRE_MAP[g]; if (slug && bySlug[slug]) ids.add(bySlug[slug]); });
  return [...ids];
}

/** Importe une série depuis Anilist ou Inko (crée auteur + série si besoin). */
const importSeries = asyncHandler(async (req, res) => {
  const { source, anilist_id, inko_id, inko_source } = req.body;

  const existing = await bookModel.findByExternal({ anilist_id, inko_id });
  if (existing) return res.json({ book: existing, created: false });

  let m;
  if (source === 'anilist' && anilist_id) m = await anilistService.getMediaById(Number(anilist_id));
  else if (source === 'inko' && inko_id) m = await inkoService.getManga(inko_id, inko_source);
  if (!m) throw new AppError('Œuvre introuvable sur la source.', 404);

  const authorName = m.author || (Array.isArray(m.authors) ? m.authors[0] : null);
  const author_id = await authorModel.ensureByName(authorName || 'Auteur inconnu');
  const slug = await bookModel.uniqueSlug(m.title);
  const category_ids = await genresToCategoryIds(m.genres || m.tags || []);

  const book = await bookModel.create({
    title: m.title,
    original_title: m.original_title || null,
    slug,
    author_id,
    cover_image_url: m.cover_image_url || null,
    kind: 'manga',
    publication_year: m.publication_year || null,
    volumes: m.volumes || null,
    chapters: m.chapters || null,
    synopsis: m.synopsis || null,
    status: 'a_lire',
    source: source === 'inko' ? 'inko' : 'anilist',
    anilist_id: anilist_id ? Number(anilist_id) : null,
    inko_id: inko_id || null,
    inko_source: inko_source || (source === 'inko' ? m.source : null),
    category_ids,
    tags: [],
  });
  res.status(201).json({ book, created: true });
});

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

module.exports = { list, getBySlug, create, update, remove, importSeries, listAssets, addAsset, removeAsset };
