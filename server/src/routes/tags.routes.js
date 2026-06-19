'use strict';

const router = require('express').Router();
const ctrl = require('../controllers/tags.controller');
const { validate } = require('../middlewares/validate.middleware');
const { requireAuth } = require('../middlewares/auth.middleware');
const schemas = require('../utils/validators');

router.get('/', ctrl.list);
router.post('/', requireAuth, validate(schemas.tagCreate), ctrl.create);
router.delete('/:id', requireAuth, ctrl.remove);

module.exports = router;
