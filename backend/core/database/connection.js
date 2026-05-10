const { DatabaseSync } = require('node:sqlite');
const path = require('path');
const fs = require('fs');

const DB_PATH = path.join(__dirname, '..', '..', '..', 'data', 'flexsaas.db');

let _db = null;

function getDb() {
  if (!_db) {
    const dir = path.dirname(DB_PATH);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    _db = new DatabaseSync(DB_PATH);
    _db.exec('PRAGMA journal_mode = WAL');
    _db.exec('PRAGMA foreign_keys = ON');
  }
  return _db;
}

// Abstracción genérica — para migrar a PostgreSQL, reemplazar estas tres funciones.
const db = {
  run(sql, params = []) {
    return getDb().prepare(sql).run(...params);
  },
  get(sql, params = []) {
    return getDb().prepare(sql).get(...params);
  },
  all(sql, params = []) {
    return getDb().prepare(sql).all(...params);
  },
};

module.exports = db;
