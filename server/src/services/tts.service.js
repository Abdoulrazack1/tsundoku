'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { MsEdgeTTS, OUTPUT_FORMAT } = require('msedge-tts');
const logger = require('../config/logger');

/**
 * Synthèse vocale "voix de doublage" via les voix neuronales de Microsoft Edge
 * (moteur "Read Aloud" — gratuit, sans clé). On met en cache les MP3 sur disque.
 */
const CACHE_DIR = path.join(__dirname, '..', '..', 'cache', 'tts');
fs.mkdirSync(CACHE_DIR, { recursive: true });

const VOICES = {
  denise: 'fr-FR-DeniseNeural',     // narratrice posée
  henri: 'fr-FR-HenriNeural',       // narrateur grave
  vivienne: 'fr-FR-VivienneMultilingualNeural', // expressive, cinématique
  remy: 'fr-FR-RemyMultilingualNeural',
};
const DEFAULT_VOICE = 'denise';

function cacheKey(voice, text) {
  return crypto.createHash('sha256').update(`${voice}::${text}`).digest('hex');
}

/** Découpe un texte long en segments (sécurité pour le moteur). */
function chunk(text, max = 4000) {
  const out = [];
  let buf = '';
  for (const sentence of text.split(/(?<=[.!?…])\s+/)) {
    if ((buf + ' ' + sentence).length > max && buf) { out.push(buf); buf = sentence; }
    else buf = buf ? `${buf} ${sentence}` : sentence;
  }
  if (buf) out.push(buf);
  return out;
}

function synthChunk(voiceId, text) {
  return new Promise((resolve, reject) => {
    const tts = new MsEdgeTTS();
    tts.setMetadata(voiceId, OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3)
      .then(() => {
        const { audioStream } = tts.toStream(text);
        const parts = [];
        let settled = false;
        const done = () => { if (settled) return; settled = true; resolve(Buffer.concat(parts)); };
        audioStream.on('data', (c) => parts.push(c));
        audioStream.on('end', done);
        audioStream.on('close', done);
        audioStream.on('error', reject);
        setTimeout(done, 30000);
      })
      .catch(reject);
  });
}

/**
 * Retourne le chemin d'un MP3 (depuis le cache ou fraîchement synthétisé).
 * @param {string} text
 * @param {string} voiceKey clé de VOICES
 */
async function synthesizeToFile(text, voiceKey = DEFAULT_VOICE) {
  const voiceId = VOICES[voiceKey] || VOICES[DEFAULT_VOICE];
  const clean = String(text || '').replace(/\s+/g, ' ').trim().slice(0, 20000);
  if (!clean) throw new Error('Texte vide.');

  const file = path.join(CACHE_DIR, `${cacheKey(voiceId, clean)}.mp3`);
  if (fs.existsSync(file) && fs.statSync(file).size > 0) return file;

  const segments = chunk(clean);
  const buffers = [];
  for (const seg of segments) buffers.push(await synthChunk(voiceId, seg));
  fs.writeFileSync(file, Buffer.concat(buffers));
  logger.info(`[tts] Synthèse ${voiceKey} (${clean.length} car.) -> ${path.basename(file)}`);
  return file;
}

module.exports = { synthesizeToFile, VOICES, DEFAULT_VOICE };
