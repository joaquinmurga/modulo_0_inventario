const { ProductModel, LogModel } = require('./model');
const { analyzeProductImage, saveImage } = require('./visionService');

const InventoryController = {
  listProducts(req, res) {
    res.json(ProductModel.findAll());
  },

  getProduct(req, res) {
    const product = ProductModel.findByBarcode(req.params.barcode);
    if (!product) return res.status(404).json({ error: 'Producto no encontrado' });
    res.json(product);
  },

  createProduct(req, res) {
    const { barcode, name, description, category, price } = req.body;
    if (!barcode || !name) {
      return res.status(400).json({ error: 'barcode y name son requeridos' });
    }
    const product = ProductModel.create({ barcode, name, description, category, price });
    res.status(201).json(product);
  },

  updateProduct(req, res) {
    const { id } = req.params;
    const { name, description, category, price } = req.body;
    if (!name) return res.status(400).json({ error: 'name es requerido' });
    const product = ProductModel.update(Number(id), { name, description, category, price });
    if (!product) return res.status(404).json({ error: 'Producto no encontrado' });
    res.json(product);
  },

  deleteProduct(req, res) {
    ProductModel.remove(Number(req.params.id));
    res.json({ status: 'deleted' });
  },

  scan(req, res) {
    const { barcode, location_block, quantity = 1 } = req.body;
    if (!barcode || !location_block) {
      return res.status(400).json({ error: 'barcode y location_block son requeridos' });
    }
    const product = ProductModel.findByBarcode(barcode);
    if (!product) return res.status(404).json({ status: 'not_found', barcode });
    const log = LogModel.addLog({ product_id: product.id, quantity, location_block });
    res.json({ status: 'logged', product, log });
  },

  getLogs(req, res) {
    const stock = LogModel.getStock(req.query.block || null);
    res.json(stock);
  },

  getBlocks(req, res) {
    const blocks = LogModel.getBlocks();
    res.json(blocks.map((b) => b.location_block));
  },

  adjustQuantity(req, res) {
    const { product_id, quantity, location_block } = req.body;
    if (!product_id || !quantity || !location_block) {
      return res.status(400).json({ error: 'product_id, quantity y location_block son requeridos' });
    }
    const log = LogModel.addLog({ product_id, quantity, location_block });
    res.json({ status: 'adjusted', log });
  },

  async analyzeImage(req, res) {
    const { image, mimeType, barcode } = req.body;
    if (!image) return res.status(400).json({ error: 'Imagen requerida en base64' });
    try {
      if (barcode) saveImage(image, barcode);
      const productData = await analyzeProductImage(image, mimeType || 'image/jpeg');
      res.json(productData);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  },
};

module.exports = InventoryController;
