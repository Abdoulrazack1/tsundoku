'use strict';

const router = require('express').Router();
const ctrl = require('../controllers/media.controller');
const { requireAuth } = require('../middlewares/auth.middleware');
const { upload } = require('../services/upload.service');

router.post('/upload', requireAuth, upload.single('image'), ctrl.upload);
router.delete('/:filename', requireAuth, ctrl.remove);

module.exports = router;
