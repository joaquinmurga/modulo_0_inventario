const db = require('./connection');

function initSchema() {
  db.run(`
    CREATE TABLE IF NOT EXISTS products (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      barcode     TEXT    NOT NULL UNIQUE,
      name        TEXT    NOT NULL,
      description TEXT,
      category    TEXT,
      price       REAL    DEFAULT 0
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS inventory_logs (
      id             INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id     INTEGER NOT NULL REFERENCES products(id),
      quantity       INTEGER NOT NULL DEFAULT 1,
      location_block TEXT    NOT NULL,
      timestamp      DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
}

module.exports = { initSchema };
