'use strict';

/* Rendu SEO côté serveur (§17) — pour que Google et les aperçus sociaux voient
   un vrai <title>, une meta description, du Open Graph et du JSON-LD SANS exécuter
   le JavaScript du client. On lit le gabarit HTML, on remplace le <title> et on
   injecte les balises propres à l'entité (article / livre) avant </head>. */

const fs = require('fs');
const path = require('path');
const env = require('./../config/env');
const postModel = require('../models/post.model');
const bookModel = require('../models/book.model');

const PUBLIC = path.join(__dirname, '..', '..', '..', 'client', 'public');
const tplCache = {};

function template(file) {
  if (tplCache[file] === undefined || !env.isProd) {
    try { tplCache[file] = fs.readFileSync(path.join(PUBLIC, file), 'utf8'); }
    catch { tplCache[file] = null; }
  }
  return tplCache[file];
}

function esc(s = '') {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
function absUrl(base, url) {
  if (!url) return '';
  if (/^https?:\/\//i.test(url)) return url;
  return base + (url.startsWith('/') ? '' : '/') + url;
}
function clip(s = '', n = 160) {
  s = String(s).replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
  return s.length > n ? s.slice(0, n - 1).trimEnd() + '…' : s;
}

function inject(html, { title, description, canonical, image, type = 'website', jsonld }) {
  let out = html;
  if (title) out = out.replace(/<title>[\s\S]*?<\/title>/i, `<title>${esc(title)}</title>`);
  // Retire les balises génériques du gabarit pour éviter les doublons
  out = out
    .replace(/\s*<meta name="description"[^>]*>/i, '')
    .replace(/\s*<meta property="og:type"[^>]*>/i, '')
    .replace(/\s*<meta name="twitter:card"[^>]*>/i, '');
  const tags = [
    env.googleSiteVerification && `<meta name="google-site-verification" content="${esc(env.googleSiteVerification)}">`,
    description && `<meta name="description" content="${esc(description)}">`,
    canonical && `<link rel="canonical" href="${esc(canonical)}">`,
    `<meta property="og:type" content="${esc(type)}">`,
    `<meta property="og:site_name" content="Tsundoku">`,
    title && `<meta property="og:title" content="${esc(title)}">`,
    description && `<meta property="og:description" content="${esc(description)}">`,
    canonical && `<meta property="og:url" content="${esc(canonical)}">`,
    image && `<meta property="og:image" content="${esc(image)}">`,
    `<meta name="twitter:card" content="${image ? 'summary_large_image' : 'summary'}">`,
    title && `<meta name="twitter:title" content="${esc(title)}">`,
    description && `<meta name="twitter:description" content="${esc(description)}">`,
    image && `<meta name="twitter:image" content="${esc(image)}">`,
    jsonld && `<script type="application/ld+json">${JSON.stringify(jsonld)}</script>`,
  ].filter(Boolean).join('\n  ');
  return out.replace('</head>', `  ${tags}\n</head>`);
}

module.exports = async function seoRender(req, res, next) {
  if (req.method !== 'GET') return next();
  const base = env.siteUrl || `${req.protocol}://${req.get('host')}`;
  const ogDefault = `${base}/assets/img/og-default.png`;
  try {
    /* --- Accueil : meta par défaut + vérification Google --- */
    if (req.path === '/' || req.path === '/index.html') {
      const html = template('index.html');
      if (!html) return next();
      const desc = 'Tsundoku — chroniques et gros dossiers manga : lecture sérieuse, planches, notes et analyses.';
      return res.type('html').send(inject(html, {
        title: 'Tsundoku — chroniques & dossiers manga', description: desc,
        canonical: `${base}/`, image: ogDefault, type: 'website',
        jsonld: { '@context': 'https://schema.org', '@type': 'WebSite', name: 'Tsundoku', url: `${base}/`, description: desc },
      }));
    }
    /* --- Article --- */
    if (req.path === '/article.html' && req.query.slug) {
      const post = await postModel.getBySlug(req.query.slug);
      const html = post && template('article.html');
      if (!html) return next();
      const desc = clip(post.meta_description || post.excerpt || `Chronique manga : ${post.title}.`);
      const canonical = `${base}/article.html?slug=${encodeURIComponent(post.slug)}`;
      const image = absUrl(base, post.cover_image_url || (post.book && post.book.cover_image_url)) || ogDefault;
      const jsonld = {
        '@context': 'https://schema.org', '@type': 'Article',
        headline: post.title, description: desc,
        ...(image ? { image: [image] } : {}),
        datePublished: post.published_at || post.created_at,
        dateModified: post.updated_at || post.published_at || post.created_at,
        author: { '@type': 'Person', name: 'Tsundoku' },
        publisher: { '@type': 'Organization', name: 'Tsundoku' },
        mainEntityOfPage: canonical,
      };
      return res.type('html').send(inject(html, {
        title: `${post.meta_title || post.title} — Tsundoku`, description: desc, canonical, image, type: 'article', jsonld,
      }));
    }
    /* --- Fiche livre / série --- */
    if (req.path === '/book.html' && req.query.slug) {
      const book = await bookModel.getBySlug(req.query.slug);
      const html = book && template('book.html');
      if (!html) return next();
      const desc = clip(book.synopsis || `${book.title} — fiche de la série sur Tsundoku.`);
      const canonical = `${base}/book.html?slug=${encodeURIComponent(book.slug)}`;
      const image = absUrl(base, book.cover_image_url) || ogDefault;
      const jsonld = {
        '@context': 'https://schema.org', '@type': 'Book',
        name: book.title, ...(book.original_title ? { alternateName: book.original_title } : {}),
        ...(book.author && book.author.name ? { author: { '@type': 'Person', name: book.author.name } } : {}),
        ...(image ? { image } : {}), description: desc, inLanguage: book.language || 'fr',
        url: canonical,
      };
      return res.type('html').send(inject(html, {
        title: `${book.title} — Tsundoku`, description: desc, canonical, image, type: 'book', jsonld,
      }));
    }
  } catch (e) {
    return next(); // jamais bloquer le rendu pour une raison SEO
  }
  return next();
};
