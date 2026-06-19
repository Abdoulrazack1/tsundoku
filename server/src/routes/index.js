'use strict';

const router = require('express').Router();
const { ping } = require('../config/database');

router.get('/health', async (req, res) => {
  try {
    await ping();
    res.json({ status: 'ok', db: 'up', time: new Date().toISOString() });
  } catch (err) {
    res.status(503).json({ status: 'degraded', db: 'down', error: err.message });
  }
});

router.use('/auth', require('./auth.routes'));
router.use('/posts', require('./posts.routes'));
router.use('/books', require('./books.routes'));
router.use('/authors', require('./authors.routes'));
router.use('/categories', require('./categories.routes'));
router.use('/tags', require('./tags.routes'));
router.use('/quotes', require('./quotes.routes'));
router.use('/timeline', require('./timeline.routes'));
router.use('/lists', require('./lists.routes'));
router.use('/stats', require('./stats.routes'));
router.use('/newsletter', require('./newsletter.routes'));
router.use('/media', require('./media.routes'));
router.use('/integration', require('./integration.routes'));
router.use('/tts', require('./tts.routes'));

module.exports = router;
