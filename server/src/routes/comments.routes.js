'use strict';

const router = require('express').Router();
const ctrl = require('../controllers/comments.controller');
const { requireAuth } = require('../middlewares/auth.middleware');

// Modération (admin)
router.get('/', requireAuth, ctrl.listAll);
router.patch('/:id/approve', requireAuth, ctrl.approve);
router.delete('/:id', requireAuth, ctrl.remove);

module.exports = router;
