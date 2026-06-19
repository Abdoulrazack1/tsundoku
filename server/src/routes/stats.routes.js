'use strict';

const router = require('express').Router();
const ctrl = require('../controllers/stats.controller');
const { requireAuth } = require('../middlewares/auth.middleware');

router.get('/public', ctrl.publicStats);
router.get('/admin', requireAuth, ctrl.adminStats);

module.exports = router;
