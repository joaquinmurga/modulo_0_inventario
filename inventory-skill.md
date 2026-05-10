# Inventory Skill — Contexto del Modulo de Inventario

> Leer este archivo es suficiente para recuperar el contexto completo del modulo en una nueva sesion.

---

## Logica de negocio

### Flujo de escaneo
1. Usuario selecciona un **Bloque** (ej. "Gondola 1", "Vitrina A").
2. Ingresa el codigo de barras por uno de tres metodos:
   - **Campo manual**: tipea el codigo y presiona Enter o el boton "Registrar".
   - **Pistola laser (HID)**: escribe automaticamente via hook global `useBarcodeScan`. Si el campo manual no tiene foco, el hook captura la secuencia y dispara sin intervencion del usuario.
   - **Camara**: `html5-qrcode` en modo continuo.
3. `POST /scan`:
   - Producto existe → registra log, muestra feedback verde.
   - Producto no existe (404) → abre `ProductModal`.
4. En `ProductModal`, el usuario elige:
   - Completar el formulario manualmente.
   - Tomar una foto en vivo (getUserMedia) para que Gemini rellene los campos.
   - Seleccionar una imagen del sistema de archivos para lo mismo.
5. Al confirmar → `POST /products` + `POST /scan` en secuencia.

### Flujo CRUD desde Dashboard
- **Nuevo producto**: boton "+ Nuevo producto" → `EditProductModal` en modo creacion (barcode editable).
- **Escaneo rapido**: campo de codigo en el Dashboard → si existe abre `AdjustQtyModal`, si no existe abre `EditProductModal` con barcode pre-llenado. La pistola laser funciona aqui tambien (hook global activo cuando no hay modales abiertos).
- **Editar**: icono de lapiz por fila → `EditProductModal` en modo edicion (barcode read-only).
- **Ajustar cantidad**: icono de flecha → `AdjustQtyModal` (toggle Agregar/Retirar, selector de bloque, botones +/-).
- **Eliminar**: icono de papelera → confirmacion inline (Si/No) → DELETE en cascada (logs + producto).

### Reglas de negocio
- Un producto puede estar en multiples bloques.
- El stock es la suma de `quantity` en `inventory_logs` (pueden ser negativos para retiros).
- Los logs son **append-only**: no se modifica stock, se agregan entradas. Esto permite auditoria historica.
- El `barcode` es unico por producto y no se puede cambiar una vez creado.
- El Dashboard usa LEFT JOIN para mostrar todos los productos, incluso los sin escaneos.

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
  quantity       INTEGER NOT NULL DEFAULT 1,  -- puede ser negativo (retiro)
  location_block TEXT    NOT NULL,
  timestamp      DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

---

## Endpoints de la API

Base URL: `http://localhost:3001/api/inventory`

| Metodo | Ruta                  | Descripcion                                         |
|--------|-----------------------|-----------------------------------------------------|
| GET    | `/products`           | Lista todos los productos ordenados por nombre      |
| GET    | `/products/:barcode`  | Busca producto por codigo de barras                 |
| POST   | `/products`           | Crea un nuevo producto                              |
| PUT    | `/products/:id`       | Edita nombre, categoria, descripcion, precio        |
| DELETE | `/products/:id`       | Elimina producto y todos sus logs (cascada)         |
| POST   | `/scan`               | Registra escaneo. 200 si existe, 404 si no          |
| GET    | `/logs`               | Stock agregado. Opcional: `?block=Gondola 1`        |
| GET    | `/blocks`             | Lista de bloques con al menos un log                |
| POST   | `/logs/adjust`        | Ajusta cantidad (positivo=agregar, negativo=retirar)|
| POST   | `/analyze-image`      | Analiza imagen con Gemini → devuelve datos producto |

### POST /scan
```json
{ "barcode": "7790123456789", "location_block": "Gondola 1", "quantity": 1 }
```
- `200`: `{ status: "logged", product, log }`
- `404`: `{ status: "not_found", barcode }` → frontend abre ProductModal

### PUT /products/:id
```json
{ "name": "Leche Entera", "category": "Lacteos", "description": "1L larga vida", "price": 1.50 }
```

### POST /logs/adjust
```json
{ "product_id": 3, "location_block": "Gondola 1", "quantity": -5 }
```

### POST /analyze-image
```json
{ "image": "<base64>", "mimeType": "image/jpeg", "barcode": "7790123456789" }
```
Respuesta: `{ name, brand, model, category, capacity, description }` (nulls si no visible).

### GET /logs (sin filtro)
```json
[{ "product_id", "barcode", "name", "category", "description", "price",
   "total_quantity", "blocks", "last_scan" }]
```

---

## Componentes frontend

### ScanPage
- Campo de texto manual + boton Registrar (Enter).
- Pistola laser via `useBarcodeScan` (hook global, deshabilitado cuando el campo tiene foco).
- Camara colapsable via `BarcodeScanner`.
- Al detectar codigo nuevo: abre `ProductModal`.

### DashboardPage
- Barra de escaneo rapido (manual + pistola laser).
- Tabla con LEFT JOIN: muestra todos los productos, incluso sin stock.
- Columnas: Producto, Categoria, Bloques, Cantidad, Precio, Ultimo escaneo, Acciones.
- Acciones por fila: ajustar cantidad, editar, eliminar (con confirmacion inline).
- Boton "+ Nuevo producto" para crear sin escanear.

### ProductModal
- Se muestra cuando el codigo escaneado no existe en la DB.
- Opciones para rellenar: manual o con IA (foto en vivo / archivo).
- Campos: nombre, categoria, descripcion, precio.

### EditProductModal
- Modo creacion (barcode editable, acepta `initialBarcode` para pre-llenarlo).
- Modo edicion (barcode read-only).
- Campos: barcode, nombre, categoria, descripcion, precio.

### AdjustQtyModal
- Toggle Agregar / Retirar (verde / rojo).
- Input de cantidad con botones +/-.
- Selector de bloque: bloques existentes + "Otro bloque..." con input libre.

### BarcodeScanner
- Import dinamico de `html5-qrcode`.
- Al desactivarse: stop() + detiene video tracks manualmente + limpia innerHTML.
- Configuracion: facingMode environment, fps 10, qrbox 280x180.

### BlockSelector
- 5 presets: Gondola 1, Gondola 2, Vitrina A, Vitrina B, Deposito.
- Input libre para bloques personalizados.

---

## Hook useBarcodeScan

```js
useBarcodeScan(onScan, enabled)
```
- Escucha `keydown` en `window`.
- Acumula caracteres en buffer.
- Si pasan mas de **300ms** sin tecla y el buffer no esta vacio → resetea (escritura humana).
- Al recibir `Enter` → llama `onScan(buffer.trim())` y limpia.
- En ScanPage: deshabilitado cuando el campo manual tiene foco (para evitar doble disparo).
- En DashboardPage: deshabilitado cuando hay cualquier modal abierto.

---

## Vision Recognition — Gemini

- **Modelo:** `gemini-3-flash-preview`
- **SDK:** `@google/generative-ai`
- **Variable de entorno:** `GEMINI_API_KEY`
- **Servicio:** `backend/modules/inventory/visionService.js`
- **Prompt:** instruye a devolver JSON plano sin caracteres especiales ni emojis.
- **Guardado:** `/uploads/<barcode>_<timestamp>.jpg` (excluido de git y Claude).
- **Captura frontend:** `getUserMedia` con canvas (foto en vivo) o `FileReader` (archivo).
- **Composicion del nombre:** `brand - model - name` (max 80 chars).
- **Categoria:** mapeada al preset mas cercano; si no hay match, se agrega como opcion dinamica al select.

---

## Notas de implementacion

### processingRef en ScanPage
`useRef(false)` en lugar de `useState` para el flag de procesamiento. El closure de `handleScan` siempre lee el valor mutable actual, evitando que dos escaneos rapidos se procesen en paralelo.

### Eliminacion en cascada
`ProductModel.remove(id)` borra primero los logs (`DELETE FROM inventory_logs WHERE product_id=?`) y luego el producto. Necesario porque `PRAGMA foreign_keys = ON` esta activo.

### Limite de body en Express
`express.json({ limit: '20mb' })` para soportar imagenes en base64 en `POST /analyze-image`. El limite por defecto (100kb) causaba respuestas HTML 413 que rompian el JSON.parse del frontend.

### Migracion SQLite a PostgreSQL
Solo se modifica `backend/core/database/connection.js`. El resto del codigo no cambia.
