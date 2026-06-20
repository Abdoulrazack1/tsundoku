'use strict';

const logger = require('../config/logger');

const ANILIST_ENDPOINT = 'https://graphql.anilist.co';

/**
 * Recherche de mangas/romans sur Anilist via leur API GraphQL publique (§22).
 * Utilise fetch natif (Node 18+). Aucun token requis pour la recherche publique.
 */
async function searchManga(query, { perPage = 8 } = {}) {
  const gql = `
    query ($search: String, $perPage: Int) {
      Page(perPage: $perPage) {
        media(search: $search, type: MANGA, sort: SEARCH_MATCH) {
          id
          title { romaji english native }
          description(asHtml: false)
          coverImage { large }
          chapters
          volumes
          startDate { year }
          genres
          staff(perPage: 1) { edges { node { name { full } } } }
        }
      }
    }`;

  const resp = await fetch(ANILIST_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ query: gql, variables: { search: query, perPage } }),
  });

  if (!resp.ok) {
    logger.warn(`[anilist] Réponse ${resp.status} pour "${query}"`);
    throw new Error(`Anilist a répondu ${resp.status}`);
  }
  const json = await resp.json();
  const media = json?.data?.Page?.media || [];
  return media.map((m) => ({
    anilist_id: m.id,
    title: m.title.english || m.title.romaji || m.title.native,
    title_native: m.title.native,
    synopsis: (m.description || '').replace(/<[^>]+>/g, '').trim(),
    cover_image_url: m.coverImage?.large || null,
    pages: m.chapters || null,
    publication_year: m.startDate?.year || null,
    genres: m.genres || [],
    author: m.staff?.edges?.[0]?.node?.name?.full || null,
    source: 'anilist',
  }));
}

/**
 * Récupère la liste manga publique d'un utilisateur Anilist (là où il « rank »).
 * Aucune authentification requise si le profil/listes sont publics.
 */
async function getUserList(username) {
  const gql = `
    query ($name: String) {
      MediaListCollection(userName: $name, type: MANGA) {
        lists {
          name
          entries {
            score(format: POINT_10_DECIMAL)
            status
            progress
            media { id title { romaji english native } coverImage { large } genres averageScore chapters volumes }
          }
        }
      }
      User(name: $name) { name avatar { large } siteUrl statistics { manga { count chaptersRead meanScore } } }
    }`;
  const resp = await fetch(ANILIST_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ query: gql, variables: { name: username } }),
  });
  if (!resp.ok) {
    logger.warn(`[anilist] liste user ${resp.status}`);
    throw new Error(resp.status === 404 ? 'Utilisateur Anilist introuvable ou listes privées.' : `Anilist a répondu ${resp.status}`);
  }
  const json = await resp.json();
  if (json.errors) throw new Error(json.errors[0]?.message || 'Erreur Anilist.');

  const lists = json?.data?.MediaListCollection?.lists || [];
  const byId = new Map();
  const STATUS = { CURRENT: 'en_cours', COMPLETED: 'lu', PLANNING: 'a_lire', DROPPED: 'abandonne', PAUSED: 'pause', REPEATING: 'relu' };
  lists.forEach((l) => (l.entries || []).forEach((e) => {
    const m = e.media; if (!m || byId.has(m.id)) return;
    byId.set(m.id, {
      anilist_id: m.id,
      title: m.title.english || m.title.romaji || m.title.native,
      cover_image_url: m.coverImage?.large || null,
      score: e.score || 0,
      status: STATUS[e.status] || 'a_lire',
      progress: e.progress || 0,
      genres: m.genres || [],
      chapters: m.chapters || null,
      volumes: m.volumes || null,
    });
  }));
  const entries = [...byId.values()].sort((a, b) => b.score - a.score);
  const user = json?.data?.User || null;
  return { user, entries };
}

/** Récupère un manga Anilist par ID exact (pour des covers fiables). */
async function getMediaById(id) {
  const gql = `query ($id: Int) { Media(id: $id, type: MANGA) {
    id title { romaji english native } description(asHtml:false) coverImage { large }
    chapters volumes startDate { year } genres staff(perPage:1){ edges{ node{ name{ full } } } } } }`;
  const resp = await fetch(ANILIST_ENDPOINT, {
    method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ query: gql, variables: { id } }),
  });
  if (!resp.ok) throw new Error(`Anilist ${resp.status}`);
  const m = (await resp.json())?.data?.Media;
  if (!m) return null;
  return {
    anilist_id: m.id,
    title: m.title.english || m.title.romaji || m.title.native,
    original_title: m.title.native || m.title.romaji || null,
    synopsis: (m.description || '').replace(/<[^>]+>/g, '').trim(),
    cover_image_url: m.coverImage?.large || null,
    chapters: m.chapters || null, volumes: m.volumes || null,
    publication_year: m.startDate?.year || null,
    author: m.staff?.edges?.[0]?.node?.name?.full || null,
    genres: m.genres || [],
  };
}

module.exports = { searchManga, getUserList, getMediaById };
