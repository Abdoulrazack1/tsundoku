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

module.exports = { searchManga };
