'use strict';

const router = require('express').Router();
const ctrl = require('../controllers/newsletter.controller');
const { validate } = require('../middlewares/validate.middleware');
const { requireAuth } = require('../middlewares/auth.middleware');
const schemas = require('../utils/validators');

router.post('/subscribe', validate(schemas.newsletter), ctrl.subscribe);
router.get('/confirm/:token', ctrl.confirm);
router.post('/unsubscribe', validate(schemas.newsletter), ctrl.unsubscribe);
router.get('/subscribers', requireAuth, ctrl.subscribers);

module.exports = router;
