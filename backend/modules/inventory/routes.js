const { Router } = require('express');
const ctrl = require('./controller');

const router = Router();

router.get('/products', ctrl.listProducts);
router.get('/products/:barcode', ctrl.getProduct);
router.post('/products', ctrl.createProduct);

router.post('/scan', ctrl.scan);
router.get('/logs', ctrl.getLogs);
router.get('/blocks', ctrl.getBlocks);

module.exports = router;
