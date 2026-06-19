'use strict';

const { pool, query, queryOne } = require('../config/database');

/* Colonnes "carte" (sans le content lourd) pour les listes. */
const CARD_COLUMNS = `
  p.id, p.title, p.slug, p.type, p.excerpt, p.cover_image_url, p.reading_time,
  p.rating, p.status, p.featured, p.views_count, p.published_at, p.created_at,
  p.book_id,
  b.title AS book_title, b.slug AS book_slug, b.cover_image_url AS book_cover,
  b.publisher AS book_publisher, b.publication_year AS book_year,
  b.isbn AS book_isbn, b.pages AS book_pages,
  a.id AS author_id, a.name AS author_name, a.slug AS author_slug
`;

const BASE_FROM = `
  FROM posts p
  LEFT JOIN books b ON p.book_id = b.id
  LEFT JOIN authors a ON b.author_id = a.id
`;

function shapeCard(row) {
  if (!row) return null;
  const book = row.book_id
    ? {
        id: row.book_id,
        title: row.book_title,
        slug: row.book_slug,
        cover_image_url: row.book_cover,
        publisher: row.book_publisher,
        publication_year: row.book_year,
        isbn: row.book_isbn,
        pages: row.book_pages,
        author: row.author_id
          ? { id: row.author_id, name: row.author_name, slug: row.author_slug }
          : null,
      }
    : null;
  return {
    id: row.id,
    title: row.title,
    slug: row.slug,
    type: row.type,
    excerpt: row.excerpt,
    content: row.content, // présent uniquement sur le détail
    cover_image_url: row.cover_image_url,
    reading_time: row.reading_time,
    rating: row.rating != null ? Number(row.rating) : null,
    rating_art: row.rating_art != null ? Number(row.rating_art) : null,
    rating_story: row.rating_story != null ? Number(row.rating_story) : null,
    rating_chars: row.rating_chars != null ? Number(row.rating_chars) : null,
    has_spoilers: !!row.has_spoilers,
    status: row.status,
    featured: !!row.featured,
    views_count: row.views_count,
    published_at: row.published_at,
    created_at: row.created_at,
    book,
    categories: [],
    tags: [],
  };
}

/** Attache catégories et tags à un ensemble de posts (1 requête chacune). */
async function attachTaxonomies(posts) {
  if (!posts.length) return posts;
  const ids = posts.map((p) => p.id);
  const placeholders = ids.map(() => '?').join(',');

  const [cats] = await pool.query(
    `SELECT pc.post_id, c.id, c.name, c.slug, c.color, c.icon
     FROM post_categories pc JOIN categories c ON pc.category_id = c.id
     WHERE pc.post_id IN (${placeholders})`,
    ids
  );
  const [tags] = await pool.query(
    `SELECT pt.post_id, t.id, t.name, t.slug
     FROM post_tags pt JOIN tags t ON pt.tag_id = t.id
     WHERE pt.post_id IN (${placeholders})`,
    ids
  );

  const byId = Object.fromEntries(posts.map((p) => [p.id, p]));
  cats.forEach((c) => byId[c.post_id]?.categories.push({ id: c.id, name: c.name, slug: c.slug, color: c.color, icon: c.icon }));
  tags.forEach((t) => byId[t.post_id]?.tags.push({ id: t.id, name: t.name, slug: t.slug }));
  return posts;
}

const SORTS = {
  newest: 'COALESCE(p.published_at, p.created_at) DESC',
  oldest: 'COALESCE(p.published_at, p.created_at) ASC',
  most_viewed: 'p.views_count DESC',
  top_rated: 'p.rating DESC',
};

/** Liste paginée avec filtres. */
async function list(opts = {}) {
  const { page = 1, limit = 9, category, tag, type, status = 'published', sort = 'newest', rating_min, q } = opts;
  const where = [];
  const params = [];

  if (status && status !== 'all') {
    where.push('p.status = ?');
    params.push(status);
  }
  if (type) {
    where.push('p.type = ?');
    params.push(type);
  }
  if (rating_min) {
    where.push('p.rating >= ?');
    params.push(Number(rating_min));
  }
  if (q) {
    where.push('(p.title LIKE ? OR p.excerpt LIKE ? OR a.name LIKE ? OR b.title LIKE ?)');
    const like = `%${q}%`;
    params.push(like, like, like, like);
  }
  if (category) {
    where.push('p.id IN (SELECT pc.post_id FROM post_categories pc JOIN categories c ON pc.category_id=c.id WHERE c.slug = ?)');
    params.push(category);
  }
  if (tag) {
    where.push('p.id IN (SELECT pt.post_id FROM post_tags pt JOIN tags t ON pt.tag_id=t.id WHERE t.slug = ?)');
    params.push(tag);
  }

  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const orderSql = SORTS[sort] || SORTS.newest;
  const offset = (page - 1) * limit;

  const [countRows] = await pool.query(`SELECT COUNT(*) AS total ${BASE_FROM} ${whereSql}`, params);
  const total = countRows[0].total;

  const [rows] = await pool.query(
    `SELECT ${CARD_COLUMNS} ${BASE_FROM} ${whereSql} ORDER BY ${orderSql} LIMIT ? OFFSET ?`,
    [...params, Number(limit), Number(offset)]
  );

  const posts = await attachTaxonomies(rows.map(shapeCard));
  return { posts, total, page: Number(page), limit: Number(limit), pages: Math.ceil(total / limit) };
}

async function getFeatured() {
  const [rows] = await pool.query(
    `SELECT ${CARD_COLUMNS}, p.content ${BASE_FROM}
     WHERE p.status='published' AND p.featured=TRUE
     ORDER BY COALESCE(p.published_at,p.created_at) DESC LIMIT 1`
  );
  if (!rows.length) {
    // fallback : dernier publié
    const [last] = await pool.query(
      `SELECT ${CARD_COLUMNS}, p.content ${BASE_FROM}
       WHERE p.status='published' ORDER BY COALESCE(p.published_at,p.created_at) DESC LIMIT 1`
    );
    if (!last.length) return null;
    return (await attachTaxonomies([shapeCard(last[0])]))[0];
  }
  return (await attachTaxonomies([shapeCard(rows[0])]))[0];
}

async function getBySlug(slug, { includeDrafts = false } = {}) {
  const statusSql = includeDrafts ? '' : "AND p.status='published'";
  const row = await queryOne(
    `SELECT ${CARD_COLUMNS}, p.content, p.meta_title, p.meta_description,
            p.rating_art, p.rating_story, p.rating_chars, p.has_spoilers ${BASE_FROM}
     WHERE p.slug = :slug ${statusSql} LIMIT 1`,
    { slug }
  );
  if (!row) return null;
  const post = shapeCard(row);
  post.meta_title = row.meta_title;
  post.meta_description = row.meta_description;
  await attachTaxonomies([post]);
  return post;
}

async function getById(id) {
  const row = await queryOne(
    `SELECT ${CARD_COLUMNS}, p.content, p.meta_title, p.meta_description,
            p.rating_art, p.rating_story, p.rating_chars, p.has_spoilers ${BASE_FROM} WHERE p.id = :id`,
    { id }
  );
  if (!row) return null;
  const post = shapeCard(row);
  post.meta_title = row.meta_title;
  post.meta_description = row.meta_description;
  return (await attachTaxonomies([post]))[0];
}

/** Article précédent / suivant (par date de publication). */
async function getAdjacent(post) {
  const pivot = post.published_at || post.created_at;
  const prev = await queryOne(
    `SELECT ${CARD_COLUMNS} ${BASE_FROM}
     WHERE p.status='published' AND COALESCE(p.published_at,p.created_at) < :pivot
     ORDER BY COALESCE(p.published_at,p.created_at) DESC LIMIT 1`,
    { pivot }
  );
  const next = await queryOne(
    `SELECT ${CARD_COLUMNS} ${BASE_FROM}
     WHERE p.status='published' AND COALESCE(p.published_at,p.created_at) > :pivot
     ORDER BY COALESCE(p.published_at,p.created_at) ASC LIMIT 1`,
    { pivot }
  );
  return { prev: shapeCard(prev), next: shapeCard(next) };
}

async function setTaxonomies(conn, postId, categoryIds = [], tagNames = []) {
  await conn.query('DELETE FROM post_categories WHERE post_id = ?', [postId]);
  await conn.query('DELETE FROM post_tags WHERE post_id = ?', [postId]);

  if (categoryIds.length) {
    const values = categoryIds.map((cid) => [postId, cid]);
    await conn.query('INSERT INTO post_categories (post_id, category_id) VALUES ?', [values]);
  }
  for (const name of tagNames) {
    const slugify = require('../utils/slugify');
    const tslug = slugify(name);
    if (!tslug) continue;
    await conn.query('INSERT IGNORE INTO tags (name, slug) VALUES (?, ?)', [name.trim(), tslug]);
    const [[tag]] = await conn.query('SELECT id FROM tags WHERE slug = ?', [tslug]);
    if (tag) await conn.query('INSERT IGNORE INTO post_tags (post_id, tag_id) VALUES (?, ?)', [postId, tag.id]);
  }
}

async function create(data, userId) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const publishedAt = data.status === 'published' ? new Date() : null;
    const [result] = await conn.query(
      `INSERT INTO posts
       (user_id, book_id, title, slug, type, excerpt, content, cover_image_url,
        reading_time, rating, rating_art, rating_story, rating_chars, has_spoilers,
        status, featured, meta_title, meta_description, published_at)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [
        userId, data.book_id || null, data.title, data.slug, data.type, data.excerpt || null,
        data.content, data.cover_image_url || null, data.reading_time || 0,
        data.rating ?? null, data.rating_art ?? null, data.rating_story ?? null, data.rating_chars ?? null,
        data.has_spoilers ? 1 : 0, data.status, data.featured ? 1 : 0,
        data.meta_title || null, data.meta_description || null, publishedAt,
      ]
    );
    await setTaxonomies(conn, result.insertId, data.category_ids, data.tags);
    await conn.commit();
    return getById(result.insertId);
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

async function update(id, data) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const fields = [];
    const params = [];
    const map = {
      book_id: 'book_id', title: 'title', slug: 'slug', type: 'type', excerpt: 'excerpt',
      content: 'content', cover_image_url: 'cover_image_url', reading_time: 'reading_time',
      rating: 'rating', rating_art: 'rating_art', rating_story: 'rating_story', rating_chars: 'rating_chars',
      has_spoilers: 'has_spoilers', status: 'status', featured: 'featured', meta_title: 'meta_title',
      meta_description: 'meta_description',
    };
    const bools = new Set(['featured', 'has_spoilers']);
    for (const [key, col] of Object.entries(map)) {
      if (data[key] !== undefined) {
        fields.push(`${col} = ?`);
        params.push(bools.has(key) ? (data[key] ? 1 : 0) : data[key]);
      }
    }
    if (data.status === 'published') {
      fields.push('published_at = COALESCE(published_at, NOW())');
    }
    if (fields.length) {
      await conn.query(`UPDATE posts SET ${fields.join(', ')} WHERE id = ?`, [...params, id]);
    }
    if (data.category_ids !== undefined || data.tags !== undefined) {
      const [[existing]] = await conn.query('SELECT id FROM posts WHERE id = ?', [id]);
      if (existing) await setTaxonomies(conn, id, data.category_ids || [], data.tags || []);
    }
    await conn.commit();
    return getById(id);
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

async function remove(id) {
  const [res] = await pool.query('DELETE FROM posts WHERE id = ?', [id]);
  return res.affectedRows > 0;
}

async function incrementViews(id, ipHash, userAgent) {
  await pool.query('UPDATE posts SET views_count = views_count + 1 WHERE id = ?', [id]);
  await pool.query('INSERT INTO post_views (post_id, ip_hash, user_agent) VALUES (?, ?, ?)', [id, ipHash || null, userAgent || null]);
}

async function slugExists(slug, excludeId = null) {
  const row = await queryOne('SELECT id FROM posts WHERE slug = :slug AND (:ex IS NULL OR id <> :ex)', { slug, ex: excludeId });
  return !!row;
}

module.exports = {
  list, getFeatured, getBySlug, getById, getAdjacent,
  create, update, remove, incrementViews, slugExists,
};
