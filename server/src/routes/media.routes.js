'use strict';

const router = require('express').Router();
const ctrl = require('../controllers/media.controller');
const { requireAuth } = require('../middlewares/auth.middleware');
const { upload } = require('../services/upload.service');

router.get('/proxy', ctrl.proxy);
router.get('/file/:id', ctrl.serve); // service public des images stockées en base
router.get('/', requireAuth, ctrl.list);
router.post('/upload', requireAuth, upload.single('image'), ctrl.upload);
router.delete('/:id', requireAuth, ctrl.remove);

module.exports = router;
