'use strict';

const router = require('express').Router();
const ctrl = require('../controllers/integration.controller');
const { requireAuth } = require('../middlewares/auth.middleware');

// Anilist
router.get('/anilist/search', requireAuth, ctrl.searchAnilist);
router.post('/anilist/sync', requireAuth, ctrl.syncAnilist);

// Inko (lecteur manga local)
router.get('/inko/health', ctrl.inkoHealth);
router.get('/inko/search', requireAuth, ctrl.searchInko);
router.get('/inko/manga/:id', requireAuth, ctrl.inkoManga);
router.get('/inko/manga/:id/chapters', requireAuth, ctrl.inkoChapters);
router.get('/inko/chapter/:id/pages', requireAuth, ctrl.inkoPages);
router.post('/inko/sync', requireAuth, ctrl.syncInko);

module.exports = router;
