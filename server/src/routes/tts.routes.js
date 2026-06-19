'use strict';

const router = require('express').Router();
const ctrl = require('../controllers/tts.controller');

router.get('/voices', ctrl.voices);
router.get('/article/:slug', ctrl.articleAudio);

module.exports = router;
