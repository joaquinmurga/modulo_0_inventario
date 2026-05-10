const { Router } = require('express');
const ctrl = require('./controller');

const router = Router();

router.get('/products', ctrl.listProducts);
router.get('/products/:barcode', ctrl.getProduct);
router.post('/products', ctrl.createProduct);
router.put('/products/:id', ctrl.updateProduct);
router.delete('/products/:id', ctrl.deleteProduct);

router.post('/scan', ctrl.scan);
router.get('/logs', ctrl.getLogs);
router.get('/blocks', ctrl.getBlocks);
router.post('/logs/adjust', ctrl.adjustQuantity);

router.post('/analyze-image', ctrl.analyzeImage);

module.exports = router;
