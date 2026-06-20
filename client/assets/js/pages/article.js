// Page article unique (§5.3, §21.5 mode zen, §21.6 audio) — la page reine.
import { api } from '../core/api.js';
import { qs, qsa, getParam, escapeHtml, safeHtml, starsHtml, formatDate, prefersReducedMotion, coverFallback } from '../core/utils.js';
import { initReadingProgress } from '../components/reading-progress.js';
import { initBook3D } from '../animations/book-3d.js';
import { splitReveal } from '../animations/gsap-init.js';
import { toast } from '../core/toast.js';
import { articleCard } from '../components/cards.js';
import { Favs } from '../components/features.js';

/* Historique de lecture (localStorage) — alimente « vus récemment ». */
function pushRecent(post) {
  try {
    const key = 'tsundoku_recent';
    const list = JSON.parse(localStorage.getItem(key) || '[]').filter((r) => r.slug !== post.slug);
    list.unshift({ slug: post.slug, title: post.title, cover: post.cover_image_url, at: Date.now() });
    localStorage.setItem(key, JSON.stringify(list.slice(0, 12)));
  } catch { /* ignore */ }
}

async function loadRelated(post) {
  const cat = post.categories?.[0];
  if (!cat) return;
  try {
    const { posts } = await api.get(`/posts?category=${cat.slug}&limit=4`);
    const related = posts.filter((p) => p.slug !== post.slug).slice(0, 3);
    if (!related.length) return;
    const sec = document.createElement('section');
    sec.className = 'section container';
    sec.innerHTML = `<div class="section-head"><p class="kicker">À lire ensuite</p><h2 class="section-head__title font-display" style="font-size:2rem">Dans le même genre</h2></div>
      <div class="grid-cards">${related.map((p) => articleCard(p, 'md')).join('')}</div>`;
    qs('#article').after(sec);
  } catch { /* ignore */ }
}

const root = qs('#article');
const TYPE_LABEL = { dossier: 'Dossier', analyse: 'Analyse', journal: 'Journal', liste: 'Liste' };

function meta(post) {
  const b = post.book;
  const bits = [];
  if (post.published_at) bits.push(formatDate(post.published_at));
  if (b?.author) bits.push(escapeHtml(b.author.name));
  if (b?.publisher) bits.push(escapeHtml(b.publisher));
  if (b?.publication_year) bits.push(b.publication_year);
  return bits.map((x) => `<span>${x}</span>`).join('');
}

function ratingAxes(post) {
  const axes = [
    ['Dessin', post.rating_art],
    ['Scénario', post.rating_story],
    ['Personnages', post.rating_chars],
  ].filter(([, v]) => v != null);
  if (!axes.length) return '';
  return `<div class="rating-axes">${axes.map(([l, v]) =>
    `<div class="rating-axis"><div class="rating-axis__val">${Number(v).toFixed(1)}</div><div class="rating-axis__label">${l}</div></div>`).join('')}</div>`;
}

function bookCard(b) {
  if (!b) return '';
  const rows = [
    ['Auteur', b.author ? `<a href="/author.html?slug=${b.author.slug}">${escapeHtml(b.author.name)}</a>` : null],
    ['Éditeur', b.publisher],
    ['Année', b.publication_year],
    ['Pages', b.pages],
    ['ISBN', b.isbn],
  ].filter(([, v]) => v);
  return `<div class="sidebar-card">
    <h4>Le livre</h4>
    <a href="/book.html?slug=${b.slug}" style="font-family:var(--font-display);font-size:1.1rem;display:block;margin-bottom:8px">${escapeHtml(b.title)}</a>
    <dl>${rows.map(([k, v]) => `<dt>${k}</dt><dd>${v}</dd>`).join('')}</dl>
    ${b.rating != null ? `<div style="margin-top:12px">${starsHtml(b.rating)}</div>` : ''}
    <a class="btn btn--sm btn--block" style="margin-top:16px" href="/book.html?slug=${b.slug}">Voir la fiche →</a>
  </div>`;
}

function adjacentCard(p, dir) {
  if (!p) return '<span></span>';
  return `<a class="article-nav__card ${dir}" href="/article.html?slug=${p.slug}" data-cursor="link">
    <img src="${coverFallback(p.cover_image_url, p.title)}" alt="">
    <span><span class="article-nav__dir">${dir === 'prev' ? '← Précédent' : 'Suivant →'}</span><br>${escapeHtml(p.title)}</span>
  </a>`;
}

function setSEO(post) {
  document.title = `${post.title} — Tsundoku`;
  const desc = post.meta_description || post.excerpt || '';
  const img = post.cover_image_url ? (location.origin + post.cover_image_url) : '';
  const set = (sel, attr, val) => { const m = qs(sel); if (m) m.setAttribute(attr, val); };
  set('meta[name="description"]', 'content', desc);
  // Open Graph / Twitter Cards dynamiques (§17.4)
  const meta = (prop, val, useName) => {
    if (!val) return;
    const sel = useName ? `meta[name="${prop}"]` : `meta[property="${prop}"]`;
    let m = qs(sel);
    if (!m) { m = document.createElement('meta'); m.setAttribute(useName ? 'name' : 'property', prop); document.head.append(m); }
    m.setAttribute('content', val);
  };
  meta('og:title', `${post.title} — Tsundoku`);
  meta('og:description', desc);
  meta('og:image', img);
  meta('og:url', location.href);
  meta('twitter:title', post.title, true);
  meta('twitter:description', desc, true);
  meta('twitter:image', img, true);
  meta('twitter:creator', '@20thHeir', true);
  // JSON-LD Article (§17.2)
  const ld = {
    '@context': 'https://schema.org', '@type': 'Article',
    headline: post.title, description: desc,
    datePublished: post.published_at, author: { '@type': 'Person', name: post.book?.author?.name || 'Tsundoku' },
    image: location.origin + (post.cover_image_url || ''),
    publisher: { '@type': 'Organization', name: 'Tsundoku' },
  };
  const s = document.createElement('script'); s.type = 'application/ld+json'; s.textContent = JSON.stringify(ld);
  document.head.append(s);
}

function buildTOC() {
  const headings = qsa('.article-body h2');
  if (headings.length < 2) return '';
  headings.forEach((h, i) => { h.id = h.id || `section-${i}`; });
  return `<nav class="toc"><h4>Sommaire</h4>${headings.map((h) => `<a href="#${h.id}">${escapeHtml(h.textContent)}</a>`).join('')}</nav>`;
}

function scrollSpy() {
  const links = qsa('.toc a');
  const map = new Map(links.map((a) => [a.getAttribute('href').slice(1), a]));
  if (!links.length) return;
  const obs = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (e.isIntersecting) {
        links.forEach((l) => l.classList.remove('is-active'));
        map.get(e.target.id)?.classList.add('is-active');
      }
    });
  }, { rootMargin: '-20% 0px -70% 0px' });
  qsa('.article-body h2').forEach((h) => obs.observe(h));
}

/* ---- Lecteur audio : vraie voix neuronale (Edge TTS) servie par le backend,
       repli Web Speech si indisponible (§21.6) ---- */
const PLAY = '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>';
const PAUSE = '<svg viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="5" width="4" height="14"/><rect x="14" y="5" width="4" height="14"/></svg>';

function initAudio(post) {
  const host = qs('#audio-player');
  if (!host) return;
  const btn = qs('#audio-btn');
  const label = qs('#audio-label');
  const rateSel = qs('#audio-rate');
  const voiceSel = qs('#audio-voice');
  const progress = qs('#audio-progress');
  btn.innerHTML = PLAY;

  const audio = new Audio();
  audio.preload = 'none';
  let loaded = false;

  const srcFor = (v) => `/api/tts/article/${post.slug}?voice=${v}`;

  async function ensureLoaded() {
    if (loaded && audio.src.includes(`voice=${voiceSel.value}`)) return;
    label.textContent = 'Préparation de la voix…';
    audio.src = srcFor(voiceSel.value);
    audio.playbackRate = parseFloat(rateSel.value) || 1;
    loaded = true;
  }

  btn.addEventListener('click', async () => {
    try {
      if (!audio.paused) { audio.pause(); return; }
      await ensureLoaded();
      await audio.play();
    } catch (err) {
      // Repli : synthèse navigateur
      fallbackSpeak(post);
    }
  });

  audio.addEventListener('playing', () => { btn.innerHTML = PAUSE; label.textContent = `Lecture — voix « ${voiceSel.value} »`; });
  audio.addEventListener('pause', () => { btn.innerHTML = PLAY; if (!audio.ended) label.textContent = 'En pause'; });
  audio.addEventListener('ended', () => { btn.innerHTML = PLAY; label.textContent = 'Écouter la chronique — voix de doublage'; if (progress) progress.style.width = '0%'; });
  audio.addEventListener('timeupdate', () => { if (progress && audio.duration) progress.style.width = `${(audio.currentTime / audio.duration) * 100}%`; });
  audio.addEventListener('error', () => { if (loaded) { label.textContent = 'Voix indisponible — repli navigateur'; fallbackSpeak(post); } });

  rateSel.addEventListener('change', () => { audio.playbackRate = parseFloat(rateSel.value) || 1; });
  voiceSel.addEventListener('change', async () => {
    const wasPlaying = !audio.paused;
    audio.pause(); loaded = false;
    if (wasPlaying) { await ensureLoaded(); audio.play().catch(() => {}); }
  });
  window.addEventListener('beforeunload', () => { audio.pause(); window.speechSynthesis?.cancel(); });
}

function fallbackSpeak(post) {
  if (!('speechSynthesis' in window)) return;
  const text = `${post.title}. ${qs('.article-body')?.textContent?.trim() || ''}`;
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text.slice(0, 6000));
  u.lang = 'fr-FR';
  const fr = speechSynthesis.getVoices().find((v) => v.lang.startsWith('fr') && /natural|online/i.test(v.name))
    || speechSynthesis.getVoices().find((v) => v.lang.startsWith('fr'));
  if (fr) u.voice = fr;
  speechSynthesis.speak(u);
}

/* ---- Mode Zen (§21.5) ---- */
function initZen() {
  const toggle = document.createElement('button');
  toggle.className = 'zen-toggle'; toggle.title = 'Mode lecture zen'; toggle.setAttribute('aria-label', 'Mode lecture zen');
  toggle.innerHTML = '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M3 12h7M14 12h7M12 3v7M12 14v7"/><circle cx="12" cy="12" r="2.5"/></svg>';
  document.body.append(toggle);

  const controls = document.createElement('div');
  controls.className = 'zen-controls';
  controls.innerHTML = `<button class="icon-btn" data-z="-">A−</button><button class="icon-btn" data-z="+">A+</button><button class="icon-btn" data-z="x" aria-label="Quitter le mode zen">✕</button>`;
  document.body.append(controls);

  let size = 1.15;
  toggle.addEventListener('click', () => document.body.classList.toggle('zen'));
  controls.addEventListener('click', (e) => {
    const z = e.target.closest('[data-z]')?.dataset.z;
    if (z === 'x') document.body.classList.remove('zen');
    if (z === '+') size = Math.min(1.6, size + 0.08);
    if (z === '-') size = Math.max(0.95, size - 0.08);
    const body = qs('.article-body');
    if (body) body.style.fontSize = `${size}rem`;
  });
}

/* ---- Partage de sélection (§23.3) ---- */
function initSelectionShare(post) {
  const bar = document.createElement('div');
  bar.className = 'selection-share';
  bar.innerHTML = '<button data-act="tweet">Partager</button><button data-act="copy">Copier</button>';
  document.body.append(bar);
  let selected = '';
  document.addEventListener('mouseup', () => {
    const sel = window.getSelection();
    const txt = sel.toString().trim();
    if (txt.length > 8 && qs('.article-body')?.contains(sel.anchorNode)) {
      selected = txt;
      const r = sel.getRangeAt(0).getBoundingClientRect();
      bar.style.top = `${r.top + window.scrollY - 44}px`;
      bar.style.left = `${r.left + r.width / 2 - 60}px`;
      bar.classList.add('is-visible');
    } else bar.classList.remove('is-visible');
  });
  bar.addEventListener('click', (e) => {
    const act = e.target.dataset.act;
    const quote = `« ${selected} » — ${post.title}`;
    if (act === 'copy') { navigator.clipboard.writeText(`${quote}\n${location.href}`); toast('Citation copiée'); }
    if (act === 'tweet') window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(quote)}&url=${encodeURIComponent(location.href)}`, '_blank');
    bar.classList.remove('is-visible');
  });
}

async function render() {
  const slug = getParam('slug');
  if (!slug) { root.innerHTML = '<p class="empty">Article introuvable.</p>'; return; }
  try {
    const { post, adjacent } = await api.get(`/posts/${slug}`);
    const cat = post.categories?.[0];

    root.innerHTML = `
      <header class="article-hero measure">
        <p class="article-hero__meta">${TYPE_LABEL[post.type] ? `<span class="text-accent">${TYPE_LABEL[post.type]}</span> · ` : ''}${cat ? `${escapeHtml(cat.name)} · ` : ''}${post.reading_time || 1} min de lecture</p>
        <h1 class="article-hero__title" id="art-title">${escapeHtml(post.title)}</h1>
        <div class="article-hero__byline">${meta(post)}</div>
        ${post.has_spoilers ? '<div style="margin-top:14px"><span class="spoiler-badge">⚠ Contient des spoilers</span></div>' : ''}
        ${post.rating != null ? `<div style="margin-top:16px">${starsHtml(post.rating)}</div>` : ''}
        ${ratingAxes(post)}
      </header>
      <figure style="text-align:center">
        <img class="article-cover" src="${coverFallback(post.cover_image_url, post.title)}" alt="Couverture : ${escapeHtml(post.book?.title || post.title)}">
      </figure>

      <div id="audio-player" class="audio-player">
        <button id="audio-btn" class="audio-player__btn" aria-label="Écouter"></button>
        <div class="audio-player__main">
          <span id="audio-label" class="audio-player__label">Écouter la chronique — voix de doublage</span>
          <div class="audio-player__bar"><div id="audio-progress"></div></div>
        </div>
        <select id="audio-voice" class="audio-player__sel" aria-label="Voix" title="Voix">
          <option value="denise">Denise</option><option value="henri">Henri</option>
          <option value="vivienne">Vivienne</option><option value="remy">Rémy</option>
        </select>
        <select id="audio-rate" class="audio-player__sel" aria-label="Vitesse" title="Vitesse">
          <option value="0.9">0.9×</option><option value="1" selected>1×</option><option value="1.15">1.15×</option><option value="1.3">1.3×</option>
        </select>
      </div>

      <div class="article-layout">
        <div class="article-body prose" id="article-body">${safeHtml(post.content)}</div>
        <aside class="article-sidebar">
          <div id="toc-slot"></div>
          <div class="sidebar-card">
            <h4>Partager & sauvegarder</h4>
            <div class="share-btns">
              <button class="icon-btn js-share-tw" aria-label="Partager sur X"><svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M18 3h3l-7 8 8 10h-6l-5-6-5 6H3l8-9L3 3h6l4 5z"/></svg></button>
              <button class="icon-btn js-share-copy" aria-label="Copier le lien"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M10 13a5 5 0 007 0l3-3a5 5 0 00-7-7l-1 1M14 11a5 5 0 00-7 0l-3 3a5 5 0 007 7l1-1"/></svg></button>
              <button class="icon-btn js-fav" aria-label="Ajouter à ma liste"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z"/></svg></button>
            </div>
          </div>
          ${bookCard(post.book)}
        </aside>
      </div>

      <nav class="article-nav">
        ${adjacentCard(adjacent?.prev, 'prev')}
        ${adjacentCard(adjacent?.next, 'next')}
      </nav>`;

    // TOC + scrollspy
    const toc = buildTOC();
    if (toc) { qs('#toc-slot').innerHTML = toc; scrollSpy(); }

    // Gabarit dédié pour les dossiers (long format)
    root.classList.toggle('is-dossier', post.type === 'dossier');

    // Rideau anti-spoilers (cliquable)
    if (post.has_spoilers) {
      const body = qs('#article-body');
      body.classList.add('spoiler-hidden');
      const btn = document.createElement('button');
      btn.className = 'spoiler-reveal';
      btn.innerHTML = '⚠ Cette chronique contient des spoilers — <strong>cliquer pour révéler</strong>';
      body.before(btn);
      btn.addEventListener('click', () => { body.classList.remove('spoiler-hidden'); btn.remove(); });
    }

    setSEO(post);
    initReadingProgress();
    initAudio(post);
    initZen();
    initSelectionShare(post);

    // Partage sidebar
    qs('.js-share-tw')?.addEventListener('click', () => window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(post.title)}&url=${encodeURIComponent(location.href)}`, '_blank'));
    qs('.js-share-copy')?.addEventListener('click', () => { navigator.clipboard.writeText(location.href); toast('Lien copié'); });

    // Favori (« Ma liste »)
    const favBtn = qs('.js-fav');
    const syncFav = () => { const on = Favs.has(post.slug); favBtn.classList.toggle('is-active', on); favBtn.querySelector('svg').setAttribute('fill', on ? 'currentColor' : 'none'); };
    syncFav();
    favBtn?.addEventListener('click', () => {
      const added = Favs.toggle({ slug: post.slug, title: post.title, cover: post.cover_image_url, author: post.book?.author?.name });
      syncFav();
      toast(added ? 'Ajouté à ma liste' : 'Retiré de ma liste', { type: 'success' });
    });

    // Livre 3D à côté de la couverture (§8.3A)
    if (window.THREE && !prefersReducedMotion() && post.cover_image_url) {
      const holder = document.createElement('div');
      holder.className = 'book-3d'; holder.style.height = '320px';
      qs('.article-sidebar')?.prepend(holder);
      initBook3D(holder, post.cover_image_url);
    }

    // Titre animé
    splitReveal(qs('#art-title'), { delay: 0.2 });
    // Compteur de vues + historique + articles liés
    api.post(`/posts/${slug}/view`).catch(() => {});
    pushRecent(post);
    loadRelated(post);
  } catch (err) {
    root.innerHTML = `<div class="empty"><h3>Article introuvable</h3><p>${escapeHtml(err.message || '')}</p><a class="btn" href="/articles.html">Voir les chroniques</a></div>`;
  }
}

render();
