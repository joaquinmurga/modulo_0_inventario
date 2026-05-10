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

  update(id, { name, description = '', category = '', price = 0 }) {
    db.run(
      'UPDATE products SET name=?, description=?, category=?, price=? WHERE id=?',
      [name, description, category, price, id]
    );
    return db.get('SELECT * FROM products WHERE id=?', [id]);
  },

  remove(id) {
    db.run('DELETE FROM inventory_logs WHERE product_id=?', [id]);
    db.run('DELETE FROM products WHERE id=?', [id]);
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

  getStock(block = null) {
    const sql = block
      ? `SELECT p.id as product_id, p.barcode, p.name, p.category, p.description, p.price,
               COALESCE(SUM(l.quantity), 0) as total_quantity,
               l.location_block,
               MAX(l.timestamp) as last_scan
         FROM inventory_logs l
         JOIN products p ON p.id = l.product_id
         WHERE l.location_block = ?
         GROUP BY p.id, l.location_block
         ORDER BY p.name`
      : `SELECT p.id as product_id, p.barcode, p.name, p.category, p.description, p.price,
               COALESCE(SUM(l.quantity), 0) as total_quantity,
               GROUP_CONCAT(DISTINCT l.location_block) as blocks,
               MAX(l.timestamp) as last_scan
         FROM products p
         LEFT JOIN inventory_logs l ON p.id = l.product_id
         GROUP BY p.id
         ORDER BY p.name`;

    return block ? db.all(sql, [block]) : db.all(sql);
  },

  getBlocks() {
    return db.all('SELECT DISTINCT location_block FROM inventory_logs ORDER BY location_block');
  },
};

module.exports = { ProductModel, LogModel };
