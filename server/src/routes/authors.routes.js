'use strict';

const router = require('express').Router();
const ctrl = require('../controllers/authors.controller');
const { validate } = require('../middlewares/validate.middleware');
const { requireAuth } = require('../middlewares/auth.middleware');
const schemas = require('../utils/validators');

router.get('/', ctrl.list);
router.get('/:slug', ctrl.getBySlug);
router.post('/', requireAuth, validate(schemas.authorCreate), ctrl.create);
router.put('/:id', requireAuth, ctrl.update);
router.delete('/:id', requireAuth, ctrl.remove);

module.exports = router;
