'use strict';

const Joi = require('joi');

const id = Joi.number().integer().positive();
const slug = Joi.string().max(255).pattern(/^[a-z0-9-]+$/);

const schemas = {
  // --- Auth ---
  login: Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().min(6).max(128).required(),
  }),

  // --- Posts ---
  postCreate: Joi.object({
    title: Joi.string().min(2).max(255).required(),
    slug: Joi.string().max(255).allow('', null),
    type: Joi.string().valid('chronique', 'journal', 'liste', 'analyse', 'dossier').default('chronique'),
    book_id: id.allow(null),
    excerpt: Joi.string().allow('', null),
    content: Joi.string().required(),
    cover_image_url: Joi.string().uri({ allowRelative: true }).max(500).allow('', null),
    rating: Joi.number().min(0).max(5).allow(null),
    rating_art: Joi.number().min(0).max(5).allow(null),
    rating_story: Joi.number().min(0).max(5).allow(null),
    rating_chars: Joi.number().min(0).max(5).allow(null),
    has_spoilers: Joi.boolean().default(false),
    status: Joi.string().valid('draft', 'published', 'archived').default('draft'),
    featured: Joi.boolean().default(false),
    meta_title: Joi.string().max(255).allow('', null),
    meta_description: Joi.string().max(320).allow('', null),
    category_ids: Joi.array().items(id).default([]),
    tags: Joi.array().items(Joi.string().max(50)).default([]),
  }),

  postUpdate: Joi.object({
    title: Joi.string().min(2).max(255),
    slug: Joi.string().max(255),
    type: Joi.string().valid('chronique', 'journal', 'liste', 'analyse', 'dossier'),
    book_id: id.allow(null),
    excerpt: Joi.string().allow('', null),
    content: Joi.string(),
    cover_image_url: Joi.string().uri({ allowRelative: true }).max(500).allow('', null),
    rating: Joi.number().min(0).max(5).allow(null),
    rating_art: Joi.number().min(0).max(5).allow(null),
    rating_story: Joi.number().min(0).max(5).allow(null),
    rating_chars: Joi.number().min(0).max(5).allow(null),
    has_spoilers: Joi.boolean(),
    status: Joi.string().valid('draft', 'published', 'archived'),
    featured: Joi.boolean(),
    meta_title: Joi.string().max(255).allow('', null),
    meta_description: Joi.string().max(320).allow('', null),
    category_ids: Joi.array().items(id),
    tags: Joi.array().items(Joi.string().max(50)),
  }).min(1),

  postQuery: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(50).default(9),
    category: slug.allow(''),
    tag: slug.allow(''),
    type: Joi.string().valid('chronique', 'journal', 'liste', 'analyse', 'dossier').allow(''),
    status: Joi.string().valid('draft', 'published', 'archived', 'all').allow(''),
    sort: Joi.string().valid('newest', 'oldest', 'most_viewed', 'top_rated').default('newest'),
    rating_min: Joi.number().min(0).max(5).allow(''),
    q: Joi.string().max(120).allow(''),
  }),

  // --- Séries manga ---
  bookCreate: Joi.object({
    title: Joi.string().min(1).max(255).required(),
    original_title: Joi.string().max(255).allow('', null),
    slug: Joi.string().max(255).allow('', null),
    author_id: id.required(),
    cover_image_url: Joi.string().uri({ allowRelative: true }).max(500).allow('', null),
    isbn: Joi.string().max(20).allow('', null),
    kind: Joi.string().valid('manga', 'manhwa', 'manhua', 'novel', 'bd').default('manga'),
    demographic: Joi.string().valid('shonen', 'seinen', 'shojo', 'josei', 'kodomo', 'none').default('none'),
    publication_year: Joi.number().integer().min(0).max(2155).allow(null),
    publisher: Joi.string().max(255).allow('', null),
    volumes: Joi.number().integer().min(0).allow(null),
    chapters: Joi.number().integer().min(0).allow(null),
    pages: Joi.number().integer().min(0).allow(null),
    language: Joi.string().max(50).allow('', null),
    synopsis: Joi.string().allow('', null),
    status: Joi.string().valid('lu', 'en_cours', 'a_lire', 'abandonne', 'relu').default('a_lire'),
    publication_status: Joi.string().valid('en_cours', 'termine', 'pause', 'annonce', 'inconnu').default('inconnu'),
    rating: Joi.number().min(0).max(5).allow(null),
    source: Joi.string().valid('tsundoku', 'anilist', 'inko').default('tsundoku'),
    anilist_id: Joi.number().integer().allow(null),
    inko_id: Joi.string().max(191).allow('', null),
    inko_source: Joi.string().max(50).allow('', null),
    category_ids: Joi.array().items(id).default([]),
    tags: Joi.array().items(Joi.string().max(50)).default([]),
  }),

  assetCreate: Joi.object({
    type: Joi.string().valid('cover', 'volume', 'chapter', 'planche', 'art').default('art'),
    label: Joi.string().max(160).allow('', null),
    image_url: Joi.string().uri({ allowRelative: true }).max(500).required(),
    position: Joi.number().integer().min(0).default(0),
  }),

  // --- Authors ---
  authorCreate: Joi.object({
    name: Joi.string().min(1).max(255).required(),
    slug: Joi.string().max(255).allow('', null),
    bio: Joi.string().allow('', null),
    image_url: Joi.string().uri({ allowRelative: true }).max(500).allow('', null),
    nationality: Joi.string().max(100).allow('', null),
    birth_date: Joi.date().iso().allow(null, ''),
    death_date: Joi.date().iso().allow(null, ''),
  }),

  // --- Categories & tags ---
  categoryCreate: Joi.object({
    name: Joi.string().min(1).max(100).required(),
    slug: Joi.string().max(100).allow('', null),
    color: Joi.string().pattern(/^#[0-9a-fA-F]{6}$/).allow('', null),
    icon: Joi.string().max(50).allow('', null),
  }),
  tagCreate: Joi.object({ name: Joi.string().min(1).max(50).required() }),

  // --- Quotes ---
  quoteCreate: Joi.object({
    book_id: id.required(),
    content: Joi.string().min(1).required(),
    page_number: Joi.number().integer().min(0).allow(null),
  }),

  // --- Timeline ---
  timelineCreate: Joi.object({
    book_id: id.required(),
    status: Joi.string().valid('lu', 'en_cours', 'a_lire', 'abandonne', 'relu').required(),
    start_date: Joi.date().iso().allow(null, ''),
    end_date: Joi.date().iso().allow(null, ''),
    notes: Joi.string().allow('', null),
    progress: Joi.number().integer().min(0).max(100).allow(null),
    source: Joi.string().valid('manual', 'anilist', 'inko').default('manual'),
  }),

  // --- Lists ---
  listCreate: Joi.object({
    title: Joi.string().min(1).max(255).required(),
    slug: Joi.string().max(255).allow('', null),
    description: Joi.string().allow('', null),
    cover_image_url: Joi.string().uri({ allowRelative: true }).max(500).allow('', null),
    book_ids: Joi.array().items(id).default([]),
  }),

  // --- Newsletter ---
  newsletter: Joi.object({ email: Joi.string().email().required() }),

  // --- Commentaires ---
  commentCreate: Joi.object({
    author_name: Joi.string().min(2).max(80).required(),
    content: Joi.string().min(2).max(2000).required(),
    parent_id: id.allow(null),
  }),

  // --- Contact ---
  contactCreate: Joi.object({
    name: Joi.string().min(2).max(120).required(),
    email: Joi.string().email().required(),
    subject: Joi.string().max(200).allow('', null),
    message: Joi.string().min(5).max(4000).required(),
  }),
};

module.exports = schemas;
