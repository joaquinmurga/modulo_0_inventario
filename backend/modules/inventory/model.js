const db = require('../../core/database/connection');

const ProductModel = {
  findByBarcode(barcode) {
    return db.get('SELECT * FROM products WHERE barcode = ?', [barcode]);
  },

  findAll() {
    return db.all('SELECT * FROM products ORDER BY name');
  },

  create({ barcode, name, description = '', category = '', price = 0 }) {
    const result = db.run(
      'INSERT INTO products (barcode, name, description, category, price) VALUES (?, ?, ?, ?, ?)',
      [barcode, name, description, category, price]
    );
    return { id: result.lastInsertRowid, barcode, name, description, category, price };
  },
};

const LogModel = {
  addLog({ product_id, quantity = 1, location_block }) {
    const result = db.run(
      'INSERT INTO inventory_logs (product_id, quantity, location_block) VALUES (?, ?, ?)',
      [product_id, quantity, location_block]
    );
    return { id: result.lastInsertRowid, product_id, quantity, location_block };
  },

  // Stock agrupado: total por producto, opcionalmente filtrado por bloque
  getStock(block = null) {
    const sql = block
      ? `SELECT p.id as product_id, p.barcode, p.name, p.category,
               SUM(l.quantity) as total_quantity,
               l.location_block,
               MAX(l.timestamp) as last_scan
         FROM inventory_logs l
         JOIN products p ON p.id = l.product_id
         WHERE l.location_block = ?
         GROUP BY p.id, l.location_block
         ORDER BY p.name`
      : `SELECT p.id as product_id, p.barcode, p.name, p.category,
               SUM(l.quantity) as total_quantity,
               GROUP_CONCAT(DISTINCT l.location_block) as blocks,
               MAX(l.timestamp) as last_scan
         FROM inventory_logs l
         JOIN products p ON p.id = l.product_id
         GROUP BY p.id
         ORDER BY p.name`;

    return block ? db.all(sql, [block]) : db.all(sql);
  },

  getBlocks() {
    return db.all('SELECT DISTINCT location_block FROM inventory_logs ORDER BY location_block');
  },
};

module.exports = { ProductModel, LogModel };
