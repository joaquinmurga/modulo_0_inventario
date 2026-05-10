const { ProductModel, LogModel } = require('./model');

const InventoryController = {
  // GET /products
  listProducts(req, res) {
    const products = ProductModel.findAll();
    res.json(products);
  },

  // GET /products/:barcode
  getProduct(req, res) {
    const product = ProductModel.findByBarcode(req.params.barcode);
    if (!product) return res.status(404).json({ error: 'Producto no encontrado' });
    res.json(product);
  },

  // POST /products
  createProduct(req, res) {
    const { barcode, name, description, category, price } = req.body;
    if (!barcode || !name) {
      return res.status(400).json({ error: 'barcode y name son requeridos' });
    }
    const product = ProductModel.create({ barcode, name, description, category, price });
    res.status(201).json(product);
  },

  // POST /scan
  scan(req, res) {
    const { barcode, location_block, quantity = 1 } = req.body;
    if (!barcode || !location_block) {
      return res.status(400).json({ error: 'barcode y location_block son requeridos' });
    }

    const product = ProductModel.findByBarcode(barcode);
    if (!product) {
      return res.status(404).json({ status: 'not_found', barcode });
    }

    const log = LogModel.addLog({ product_id: product.id, quantity, location_block });
    res.json({ status: 'logged', product, log });
  },

  // GET /logs?block=...
  getLogs(req, res) {
    const { block } = req.query;
    const stock = LogModel.getStock(block || null);
    res.json(stock);
  },

  // GET /blocks
  getBlocks(req, res) {
    const blocks = LogModel.getBlocks();
    res.json(blocks.map((b) => b.location_block));
  },
};

module.exports = InventoryController;
