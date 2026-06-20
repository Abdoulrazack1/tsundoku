'use strict';

const router = require('express').Router();
const ctrl = require('../controllers/contact.controller');
const { validate } = require('../middlewares/validate.middleware');
const { requireAuth } = require('../middlewares/auth.middleware');
const { submitLimiter } = require('../middlewares/rateLimit.middleware');
const schemas = require('../utils/validators');

router.post('/', submitLimiter, validate(schemas.contactCreate), ctrl.send);
router.get('/', requireAuth, ctrl.list);
router.patch('/:id/read', requireAuth, ctrl.markRead);
router.delete('/:id', requireAuth, ctrl.remove);

module.exports = router;
