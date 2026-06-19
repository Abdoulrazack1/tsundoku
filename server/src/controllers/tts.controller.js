'use strict';

const fs = require('fs');
const asyncHandler = require('../utils/asyncHandler');
const ttsService = require('../services/tts.service');
const postModel = require('../models/post.model');
const { AppError } = require('../middlewares/error.middleware');

function htmlToSpeech(html, title) {
  const body = String(html || '')
    .replace(/<(script|style)[^>]*>[\s\S]*?<\/\1>/gi, '')
    .replace(/<\/(p|h2|h3|li|blockquote|figcaption)>/gi, '. ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&[a-z]+;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return `${title}. . ${body}`;
}

/** Audio d'un article (voix neuronale Edge, mise en cache). */
const articleAudio = asyncHandler(async (req, res) => {
  const post = await postModel.getBySlug(req.params.slug, { includeDrafts: !!req.user });
  if (!post) throw new AppError('Article introuvable.', 404);
  const voice = (req.query.voice || ttsService.DEFAULT_VOICE).toLowerCase();
  const text = htmlToSpeech(post.content, post.title);

  const file = await ttsService.synthesizeToFile(text, voice);
  const stat = fs.statSync(file);
  res.set({
    'Content-Type': 'audio/mpeg',
    'Content-Length': stat.size,
    'Cache-Control': 'public, max-age=86400',
    'Accept-Ranges': 'bytes',
  });
  fs.createReadStream(file).pipe(res);
});

const voices = asyncHandler(async (req, res) => {
  res.json({ voices: Object.keys(ttsService.VOICES), default: ttsService.DEFAULT_VOICE });
});

module.exports = { articleAudio, voices };
