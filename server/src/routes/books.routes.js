'use strict';

const router = require('express').Router();
const ctrl = require('../controllers/books.controller');
const { validate } = require('../middlewares/validate.middleware');
const { requireAuth } = require('../middlewares/auth.middleware');
const schemas = require('../utils/validators');

router.get('/', ctrl.list);
router.post('/import', requireAuth, ctrl.importSeries);
router.get('/:id/assets', ctrl.listAssets);
router.post('/:id/assets', requireAuth, validate(schemas.assetCreate), ctrl.addAsset);
router.delete('/assets/:assetId', requireAuth, ctrl.removeAsset);
router.get('/:slug', ctrl.getBySlug);
router.post('/', requireAuth, validate(schemas.bookCreate), ctrl.create);
router.put('/:id', requireAuth, ctrl.update);
router.delete('/:id', requireAuth, ctrl.remove);

module.exports = router;
