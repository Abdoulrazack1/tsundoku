'use strict';

const router = require('express').Router();
const ctrl = require('../controllers/quotes.controller');
const { validate } = require('../middlewares/validate.middleware');
const { requireAuth } = require('../middlewares/auth.middleware');
const schemas = require('../utils/validators');

router.get('/', ctrl.list);
router.get('/random', ctrl.random);
router.post('/', requireAuth, validate(schemas.quoteCreate), ctrl.create);
router.delete('/:id', requireAuth, ctrl.remove);

module.exports = router;
