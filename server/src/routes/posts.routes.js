'use strict';

const router = require('express').Router();
const ctrl = require('../controllers/posts.controller');
const { validate } = require('../middlewares/validate.middleware');
const { requireAuth } = require('../middlewares/auth.middleware');
const schemas = require('../utils/validators');

// Lecture publique
router.get('/', validate(schemas.postQuery, 'query'), ctrl.list);
router.get('/featured', ctrl.featured);
router.get('/random', ctrl.random);
router.get('/search', ctrl.search);
router.get('/id/:id', requireAuth, ctrl.getById); // admin : par ID, contenu complet
router.get('/:slug', ctrl.getBySlug);
router.post('/:slug/view', ctrl.incrementView);

// Écriture admin
router.post('/', requireAuth, validate(schemas.postCreate), ctrl.create);
router.put('/:id', requireAuth, validate(schemas.postUpdate), ctrl.update);
router.patch('/:id/status', requireAuth, ctrl.updateStatus);
router.delete('/:id', requireAuth, ctrl.remove);

module.exports = router;
