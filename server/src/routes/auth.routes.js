'use strict';

const router = require('express').Router();
const ctrl = require('../controllers/auth.controller');
const { validate } = require('../middlewares/validate.middleware');
const { requireAuth } = require('../middlewares/auth.middleware');
const { authLimiter } = require('../middlewares/rateLimit.middleware');
const schemas = require('../utils/validators');

router.post('/login', authLimiter, validate(schemas.login), ctrl.login);
router.post('/refresh', ctrl.refresh);
router.post('/logout', ctrl.logout);
router.get('/me', requireAuth, ctrl.me);

module.exports = router;
