'use strict';

const asyncHandler = require('../utils/asyncHandler');
const postModel = require('../models/post.model');
const { escapeHtml } = require('../utils/sanitize');

function siteUrl(req) {
  return `${req.protocol}://${req.get('host')}`;
}

/** Flux RSS 2.0 des derniers articles (§23.2). */
const rss = asyncHandler(async (req, res) => {
  const base = siteUrl(req);
  const { posts } = await postModel.list({ limit: 30, status: 'published' });
  const items = posts
    .map((p) => `
    <item>
      <title>${escapeHtml(p.title)}</title>
      <link>${base}/article.html?slug=${p.slug}</link>
      <guid isPermaLink="false">tsundoku-${p.id}</guid>
      <pubDate>${new Date(p.published_at || p.created_at).toUTCString()}</pubDate>
      <description>${escapeHtml(p.excerpt || '')}</description>
      ${p.categories.map((c) => `<category>${escapeHtml(c.name)}</category>`).join('')}
    </item>`)
    .join('');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>Tsundoku — Journal de lectures</title>
    <link>${base}</link>
    <description>Chroniques de livres et journal de lecture.</description>
    <language>fr</language>
    <atom:link href="${base}/rss.xml" rel="self" type="application/rss+xml" />
    ${items}
  </channel>
</rss>`;
  res.type('application/rss+xml').send(xml);
});

/** Sitemap XML dynamique (§17.3). */
const sitemap = asyncHandler(async (req, res) => {
  const base = siteUrl(req);
  const { posts } = await postModel.list({ limit: 500, status: 'published' });
  const staticUrls = ['', '/articles.html', '/library.html', '/quotes.html', '/lists.html', '/stats.html', '/journal.html', '/about.html'];
  const urls = [
    ...staticUrls.map((u) => `<url><loc>${base}${u || '/'}</loc><changefreq>weekly</changefreq></url>`),
    ...posts.map((p) => `<url><loc>${base}/article.html?slug=${p.slug}</loc><lastmod>${new Date(p.updated_at || p.created_at).toISOString().slice(0, 10)}</lastmod></url>`),
  ].join('');
  res.type('application/xml').send(`<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls}</urlset>`);
});

/** robots.txt (§17.3) — exclut l'admin. */
const robots = (req, res) => {
  const base = siteUrl(req);
  res.type('text/plain').send(`User-agent: *
Disallow: /admin/
Allow: /

Sitemap: ${base}/sitemap.xml`);
};

module.exports = { rss, sitemap, robots };
