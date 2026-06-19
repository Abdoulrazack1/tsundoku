'use strict';

const router = require('express').Router();
const ctrl = require('../controllers/lists.controller');
const { validate } = require('../middlewares/validate.middleware');
const { requireAuth } = require('../middlewares/auth.middleware');
const schemas = require('../utils/validators');

router.get('/', ctrl.list);
router.get('/:slug', ctrl.getBySlug);
router.post('/', requireAuth, validate(schemas.listCreate), ctrl.create);
router.delete('/:id', requireAuth, ctrl.remove);

module.exports = router;
