'use strict';

const { pool, queryOne } = require('../config/database');

/** Chiffres clés publics ("En chiffres" §5.10). */
async function publicOverview() {
  const totals = await queryOne(`
    SELECT
      (SELECT COUNT(*) FROM posts WHERE status='published') AS total_posts,
      (SELECT COUNT(*) FROM books) AS total_books,
      (SELECT COUNT(*) FROM books WHERE status IN ('lu','relu')) AS books_read,
      (SELECT COALESCE(SUM(pages),0) FROM books WHERE status IN ('lu','relu')) AS pages_read,
      (SELECT COUNT(*) FROM authors) AS total_authors,
      (SELECT COUNT(*) FROM quotes) AS total_quotes,
      (SELECT COALESCE(SUM(views_count),0) FROM posts) AS total_views
  `);

  const [byCategory] = await pool.query(`
    SELECT c.name, c.slug, c.color, COUNT(bc.book_id) AS count
    FROM categories c LEFT JOIN book_categories bc ON bc.category_id=c.id
    GROUP BY c.id ORDER BY count DESC
  `);

  const [byYear] = await pool.query(`
    SELECT YEAR(COALESCE(rt.end_date, rt.start_date)) AS year, COUNT(*) AS count
    FROM reading_timeline rt
    WHERE rt.status IN ('lu','relu') AND COALESCE(rt.end_date, rt.start_date) IS NOT NULL
    GROUP BY year ORDER BY year ASC
  `);

  const [topAuthors] = await pool.query(`
    SELECT a.name, a.slug, COUNT(b.id) AS books, ROUND(AVG(b.rating),2) AS avg_rating
    FROM authors a JOIN books b ON b.author_id=a.id
    GROUP BY a.id ORDER BY books DESC, avg_rating DESC LIMIT 5
  `);

  return { totals, byCategory, byYear, topAuthors };
}

/** Tableau de bord admin (vues, etc. §6.2). */
async function adminOverview() {
  const pub = await publicOverview();
  const totals = await queryOne(`
    SELECT
      (SELECT COUNT(*) FROM posts) AS all_posts,
      (SELECT COUNT(*) FROM posts WHERE status='published') AS published_posts,
      (SELECT COUNT(*) FROM posts WHERE status='draft') AS draft_posts,
      (SELECT COUNT(*) FROM newsletter_subscribers WHERE unsubscribed_at IS NULL) AS subscribers,
      (SELECT COUNT(*) FROM books) AS books,
      (SELECT COALESCE(SUM(views_count),0) FROM posts) AS views
  `);

  const [viewsByDay] = await pool.query(`
    SELECT DATE(viewed_at) AS day, COUNT(*) AS count
    FROM post_views WHERE viewed_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
    GROUP BY day ORDER BY day ASC
  `);

  const [topPosts] = await pool.query(`
    SELECT id, title, slug, views_count FROM posts
    WHERE status='published' ORDER BY views_count DESC LIMIT 5
  `);

  return { ...pub, totals, viewsByDay, topPosts };
}

module.exports = { publicOverview, adminOverview };
