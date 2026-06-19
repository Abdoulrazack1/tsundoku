'use strict';

const env = require('../config/env');
const logger = require('../config/logger');
const { AppError } = require('../middlewares/error.middleware');

/**
 * Proxy vers l'API Inko locale (lecteur manga de l'utilisateur, port 8088,
 * lui-même proxy MangaDex & autres sources). Permet à Tsundoku de chercher
 * une œuvre, récupérer sa couverture, ses chapitres et ses planches.
 */
const BASE = env.inkoBase;

async function call(path) {
  let resp;
  try {
    resp = await fetch(`${BASE}${path}`, { headers: { Accept: 'application/json' } });
  } catch (err) {
    logger.warn(`[inko] injoignable : ${err.message}`);
    throw new AppError("Inko est injoignable. Lance le lecteur Inko (port 8088) puis réessaie.", 424, 'INKO_DOWN');
  }
  if (!resp.ok) throw new AppError(`Inko a répondu ${resp.status}`, 502, 'INKO_ERROR');
  return resp.json();
}

function normItem(m, source) {
  return {
    inko_id: m.id,
    source: m.source || source || 'mangadex',
    title: m.title,
    cover_image_url: m.coverLarge || m.cover || m.coverThumb || null,
    tags: m.tags || [],
    status: m.status || null,
    synopsis: m.description || m.synopsis || null,
    authors: m.authors || (m.author ? [m.author] : []),
    year: m.year || m.startYear || null,
  };
}

/** Recherche : sur une source précise (ex: weebcentral) ou multi-sources. */
async function search(q, { source } = {}) {
  if (source) {
    const data = await call(`/sources/${source}/mangas/search?q=${encodeURIComponent(q)}&limit=18`);
    return (data.results || []).map((m) => normItem(m, source));
  }
  const data = await call(`/search-all?q=${encodeURIComponent(q)}&limit=8`);
  const results = [];
  (data.groups || []).forEach((g) => (g.items || []).forEach((it) => results.push(normItem(it, g.source))));
  return results;
}

async function getManga(id, source) {
  const path = source ? `/sources/${source}/mangas/${encodeURIComponent(id)}` : `/mangas/${encodeURIComponent(id)}`;
  const m = await call(path);
  return normItem(m, source);
}

async function getChapters(id, source) {
  const path = source ? `/sources/${source}/mangas/${encodeURIComponent(id)}/chapters` : `/mangas/${encodeURIComponent(id)}/chapters`;
  const data = await call(path);
  return (data.results || []).map((c) => ({ id: c.id, title: c.title, chapter: c.chapter, volume: c.volume || null }));
}

async function getPages(chapterId, source) {
  const path = source ? `/sources/${source}/chapters/${encodeURIComponent(chapterId)}/pages` : `/chapters/${encodeURIComponent(chapterId)}/pages`;
  const data = await call(path);
  return (data.pages || []).map((p) => ({ page: p.page, url: p.url }));
}

async function health() {
  try { await call('/health'); return true; } catch { return false; }
}

module.exports = { search, getManga, getChapters, getPages, health };
