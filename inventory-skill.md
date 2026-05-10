# Inventory Skill — Contexto del Módulo de Inventario

> Leer este archivo es suficiente para recuperar el contexto completo del módulo en una nueva sesión.

---

## Lógica de negocio

### Flujo principal
1. El usuario define un **Bloque de Escaneo** (ej. "Góndola 1", "Vitrina A") antes de escanear.
2. Se activa el escáner (cámara o pistola HID).
3. Al detectar un código de barras:
   - **Producto existe** → se suma 1 unidad al `inventory_logs` para ese bloque.
   - **Producto no existe** → se abre un modal para registrar `name` y `category`. Luego se crea el producto y se registra el log.
4. El Dashboard muestra el stock consolidado por producto, con filtro opcional por bloque.

### Reglas de negocio
- Un mismo producto puede estar en múltiples bloques.
- El stock total de un producto = suma de `quantity` en todos los `inventory_logs`.
- El stock por bloque = suma de `quantity` en `inventory_logs` filtrado por `location_block`.
- El `barcode` es único por producto.

---

## Esquema de base de datos

```sql
CREATE TABLE IF NOT EXISTS products (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  barcode     TEXT    NOT NULL UNIQUE,
  name        TEXT    NOT NULL,
  description TEXT,
  category    TEXT,
  price       REAL    DEFAULT 0
);

CREATE TABLE IF NOT EXISTS inventory_logs (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  product_id     INTEGER NOT NULL REFERENCES products(id),
  quantity       INTEGER NOT NULL DEFAULT 1,
  location_block TEXT    NOT NULL,
  timestamp      DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

---

## Endpoints de la API

Base URL: `http://localhost:3001/api/inventory`

### Productos

| Método | Ruta                   | Descripción                                      |
|--------|------------------------|--------------------------------------------------|
| GET    | `/products`            | Lista todos los productos                        |
| GET    | `/products/:barcode`   | Busca un producto por código de barras           |
| POST   | `/products`            | Crea un nuevo producto                           |

**POST /products — Body:**
```json
{
  "barcode": "7790123456789",
  "name": "Leche Entera 1L",
  "description": "Leche entera larga vida",
  "category": "Lácteos",
  "price": 1.50
}
```

### Escaneo / Logs

| Método | Ruta        | Descripción                                               |
|--------|-------------|-----------------------------------------------------------|
| POST   | `/scan`     | Registra un escaneo (crea log o dispara flujo de nuevo producto) |
| GET    | `/logs`     | Lista logs con stock agrupado, con filtro por bloque      |

**POST /scan — Body:**
```json
{
  "barcode": "7790123456789",
  "location_block": "Góndola 1",
  "quantity": 1
}
```

**POST /scan — Respuestas:**
- `200 { status: "logged", product }` → producto encontrado, log registrado.
- `404 { status: "not_found", barcode }` → producto no existe, el frontend abre el modal.

**GET /logs?block=Góndola 1 — Respuesta:**
```json
[
  {
    "product_id": 1,
    "barcode": "7790123456789",
    "name": "Leche Entera 1L",
    "category": "Lácteos",
    "total_quantity": 12,
    "location_block": "Góndola 1",
    "last_scan": "2026-05-10T14:30:00Z"
  }
]
```

---

## Estructura de archivos del módulo

```
backend/
├── core/
│   └── database/
│       ├── connection.js   # Abstracción SQLite (reemplazar por PG aquí)
│       └── schema.js       # Inicialización de tablas
├── modules/
│   └── inventory/
│       ├── model.js        # SQL queries
│       ├── controller.js   # Lógica de negocio
│       └── routes.js       # Express Router
└── server.js               # Entry point

frontend/src/
├── services/
│   └── api.js              # Fetch wrapper centralizado
├── hooks/
│   └── useBarcodeScan.js   # Detecta input de pistola HID
├── components/
│   ├── BarcodeScanner.jsx  # Cámara con html5-qrcode
│   ├── ProductModal.jsx    # Modal de nuevo producto
│   └── BlockSelector.jsx   # Selector de bloque de escaneo
└── pages/
    ├── ScanPage.jsx        # Vista de escaneo activo
    └── DashboardPage.jsx   # Vista de stock y filtros
```

---

## Notas de implementación

### Migración SQLite → PostgreSQL
Para migrar, solo se modifica `backend/core/database/connection.js`:
- Reemplazar `node:sqlite` (módulo nativo de Node.js ≥22) por `pg` (node-postgres).
- Adaptar las funciones `db.run()`, `db.get()`, `db.all()` al cliente de PG (async/await).
- El resto del código (model, controller, routes) no cambia.

### Escaneo dual
- **Cámara:** `html5-qrcode` en modo continuo dentro de `<BarcodeScanner />`.
- **Pistola HID:** El hook `useBarcodeScan` escucha `keydown` globalmente. Si los caracteres llegan en ráfagas (< 50ms entre teclas) y terminan en `Enter`, se trata como un escaneo de pistola.
