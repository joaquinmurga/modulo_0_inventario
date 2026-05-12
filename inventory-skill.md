# Inventory Skill — Contexto del Modulo de Inventario

> Leer este archivo es suficiente para recuperar el contexto completo del modulo en una nueva sesion.

---

## Logica de negocio

### Flujo de escaneo — Mobile (modo "Solo escanear", default)
1. Usuario selecciona un **Bloque**.
2. Ingresa codigo por campo manual o camara continua (nunca se detiene).
3. `POST /scan`:
   - Existe → registra log, muestra feedback, listo para siguiente.
   - No existe (404) → crea producto con barcode como nombre provisional → `POST /scan`. Sin interrupcion.

### Flujo de escaneo — Mobile (modo "Escanear y completar")
1. Usuario selecciona un **Bloque**.
2. Ingresa el codigo de barras por uno de dos metodos:
   - **Campo manual**: tipea el codigo y presiona Enter o el boton "Registrar".
   - **Camara**: `CameraView` nativa, continua (no se detiene tras cada escaneo).
3. `POST /scan`:
   - Producto existe → registra log, muestra feedback verde.
   - Producto no existe (404) → abre `ProductModal`.
4. En `ProductModal`, el usuario elige:
   - Completar el formulario manualmente.
   - Tomar foto (launchCameraAsync) o abrir galeria (launchImageLibraryAsync) para analisis con Gemini.
5. Al confirmar → `POST /products` + `POST /scan` en secuencia.

### Flujo de escaneo — Web
1. Usuario selecciona un **Bloque**.
2. Ingresa codigo: campo manual, pistola laser (HID via `useBarcodeScan`) o camara (`html5-qrcode`).
3. `POST /scan`: existe → log; no existe → abre `ProductModal` con opciones manual o IA.

### Flujo CRUD desde Dashboard
- **Nuevo producto**: boton "+ Nuevo producto" → `EditProductModal` / formulario inline en modo creacion (barcode editable).
- **Escaneo rapido**: campo de codigo en el Dashboard → si existe abre `AdjustQtyModal`, si no existe abre `EditProductModal` con barcode pre-llenado.
- **Editar**: icono de lapiz por fila → `EditProductModal` en modo edicion (barcode read-only).
- **Ajustar cantidad**: icono de flecha → `AdjustQtyModal` (toggle Agregar/Retirar, selector de bloque, botones +/-).
- **Eliminar**: icono de papelera → confirmacion inline (web) o `Alert.alert` (mobile) → DELETE en cascada.

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

Base URL web: `http://localhost:3001/api/inventory`
Base URL mobile: `http://<IP_LAN>:3001/api/inventory` (configurable en Ajustes)

| Metodo | Ruta                  | Descripcion                                         |
|--------|-----------------------|-----------------------------------------------------|
| GET    | `/health`             | Test de conexion. Devuelve `{ module: 'FlexSaaS' }` |
| GET    | `/products`           | Lista todos los productos ordenados por nombre      |
| GET    | `/products/:barcode`  | Busca producto por codigo de barras                 |
| POST   | `/products`           | Crea un nuevo producto                              |
| PUT    | `/products/:id`       | Edita nombre, categoria, descripcion, precio        |
| DELETE | `/products/:id`       | Elimina producto y todos sus logs (cascada)         |
| POST   | `/scan`               | Registra escaneo. 200 si existe, 404 si no          |
| GET    | `/logs`               | Stock agregado. Opcional: `?block=X` y/o `?q=texto` |
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

### GET /logs (sin filtro / con busqueda)
```
GET /logs                     → todos los productos
GET /logs?q=coca              → filtra por nombre, barcode o categoria (LIKE %coca%)
GET /logs?block=Gondola+1     → filtra por bloque
GET /logs?q=leche&block=X     → combina ambos filtros
```
```json
[{ "product_id", "barcode", "name", "category", "description", "price",
   "total_quantity", "blocks", "last_scan" }]
```

---

## Componentes web (frontend/)

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
- Opciones para rellenar: manual o con IA (foto en vivo getUserMedia / archivo).
- Campos: nombre, categoria, descripcion, precio.

### EditProductModal
- Modo creacion (barcode editable, acepta `initialBarcode` para pre-llenarlo).
- Modo edicion (barcode read-only).
- Campos: barcode, nombre, categoria, descripcion, precio.

### AdjustQtyModal
- Toggle Agregar / Retirar (verde / rojo).
- Input de cantidad con botones +/-.
- Selector de bloque: bloques existentes + "Otro bloque..." con input libre.

### BarcodeScanner (web)
- Import dinamico de `html5-qrcode`.
- Al desactivarse: stop() + detiene video tracks manualmente + limpia innerHTML.
- Configuracion: facingMode environment, fps 10, qrbox 280x180.

### BlockSelector (web)
- 5 presets: Gondola 1, Gondola 2, Vitrina A, Vitrina B, Deposito.
- Input libre para bloques personalizados.

---

## Componentes mobile (mobile/src/components/)

### NoServer
- Pantalla mostrada cuando `serverOk === false`.
- Boton que navega a `/settings_tab` via `useRouter()`.

### BarcodeScanner (mobile)
- `CameraView` de expo-camera con `onBarcodeScanned`.
- `useCameraPermissions()` para solicitar permisos en runtime.
- Tipos: ean13, ean8, ean5, code128, code39, upc_a, qr.
- Height fija 220px, facing "back".

### BlockSelector (mobile)
- ScrollView horizontal con pills de presets.
- TextInput + boton "Usar" para bloques personalizados.

### ProductModal (mobile)
- Bottom sheet Modal (justifyContent: 'flex-end').
- Botones: "Tomar foto" (launchCameraAsync) y "Galeria" (launchImageLibraryAsync).
- base64: true, quality: 0.7 para enviar a `api.analyzeImage()`.
- Selector de categoria como pills horizontales.

---

## Screens mobile (mobile/app/)

### scan.jsx
- Verifica `serverOk` al montar via `getServerUrl()`.
- `processingRef = useRef(false)` para evitar doble procesamiento.
- **Control segmentado** "Solo escanear" (default) / "Escanear y completar" — seleccionar uno deselecciona el otro.
- TextInput para entrada manual con `onSubmitEditing`.
- Camara nativa con `BarcodeScanner` — no se detiene tras cada escaneo exitoso.
- En 404 con "Solo escanear": crea producto con barcode como nombre, registra log, continua.
- En 404 con "Escanear y completar": abre `ProductModal`.

### dashboard.jsx
- `FlatList` de productos (no tabla — apropiado para mobile).
- **Busqueda server-side**: debounce 400ms → `GET /logs?q=<texto>`. Sin filtro local.
- `currentSearch` ref: las mutaciones refetchean con el termino activo.
- Carga datos solo al montar; no recarga en cada foco del tab.
- **ProductFormModal** incluye seccion "Completar con IA": botones "Tomar foto" y "Galeria" con `expo-image-picker` + `api.analyzeImage()`. Disponible tanto al crear como al editar.
- `Alert.alert()` para confirmacion de eliminacion.
- Stats cards: total productos y total unidades.

### settings_tab.jsx
- TextInput para URL del servidor.
- "Probar conexion" → `api.testConnection()` (GET /health).
- "Guardar" → `setServerUrl(url)`.
- "Desconectar" → `clearServerUrl()`.
- Instrucciones para obtener IP local con `ipconfig`.

---

## Hook useBarcodeScan (solo web)

```js
useBarcodeScan(onScan, enabled)
```
- Escucha `keydown` en `window`.
- Acumula caracteres en buffer.
- Si pasan mas de **300ms** sin tecla y el buffer no esta vacio → resetea (escritura humana).
- Al recibir `Enter` → llama `onScan(buffer.trim())` y limpia.
- En ScanPage: deshabilitado cuando el campo manual tiene foco.
- En DashboardPage: deshabilitado cuando hay cualquier modal abierto.

---

## Vision Recognition — Gemini

- **Modelo:** `gemini-3-flash-preview`
- **SDK:** `@google/generative-ai`
- **Variable de entorno:** `GEMINI_API_KEY`
- **Servicio:** `backend/modules/inventory/visionService.js`
- **Prompt:** instruye a devolver JSON plano sin caracteres especiales ni emojis.
- **Guardado:** `/uploads/<barcode>_<timestamp>.jpg` (excluido de git y Claude).
- **Captura web:** `getUserMedia` con canvas (foto en vivo) o `FileReader` (archivo).
- **Captura mobile:** `launchCameraAsync` o `launchImageLibraryAsync` con `base64: true`.
- **Composicion del nombre:** `brand - model - name` (max 80 chars).
- **Regex JSON:** `/\{[\s\S]*\}/` (greedy) para capturar objetos anidados completos.

---

## Notas de implementacion

### processingRef en scan
`useRef(false)` en lugar de `useState` para el flag de procesamiento. El closure de `handleScan` siempre lee el valor mutable actual, evitando que dos escaneos rapidos se procesen en paralelo.

### Eliminacion en cascada
`ProductModel.remove(id)` borra primero los logs (`DELETE FROM inventory_logs WHERE product_id=?`) y luego el producto. Necesario porque `PRAGMA foreign_keys = ON` esta activo.

### Limite de body en Express
`express.json({ limit: '20mb' })` para soportar imagenes en base64 en `POST /analyze-image`. El limite por defecto (100kb) causaba respuestas HTML 413 que rompian el JSON.parse.

### Compatibilidad Android en emulador
Expo SDK 52 no cumple el requisito de alineacion de paginas de 16KB de Android 15+.
Usar emulador con **Android 14 (API 34)** con imagen "Google Play". Android 17 da error al iniciar la app.

### expo-asset
Debe instalarse por separado aunque no aparezca en package.json explicitamente:
```cmd
npx expo install expo-asset
```

### Configuracion de servidor en mobile
La app mobile no tiene proxy. El usuario configura la IP del backend en la tab "Ajustes".
La URL se guarda en AsyncStorage con clave `@flexsaas:server_url`.
El backend debe escuchar en `0.0.0.0` (no `localhost`) para aceptar conexiones LAN.
En emulador Android usar `http://10.0.2.2:3001` (alias del host). En dispositivo fisico usar la IP LAN del PC.

### Routing mobile — index.jsx
Expo Router requiere una ruta raiz. `app/index.jsx` hace `<Redirect href="/(tabs)/scan" />`.
Sin este archivo, la app muestra "NOT FOUND" al arrancar.
El Stack en `_layout.jsx` solo declara la pantalla `(tabs)` — no declarar pantallas inexistentes o Expo Router emite warning y puede fallar.

### Busqueda server-side
`LogModel.getStock(block, q)` construye la clausula WHERE dinamicamente segun los parametros presentes.
El termino `q` se convierte en `%q%` para LIKE. Se busca en `p.name`, `p.barcode` y `p.category`.
En el cliente, `currentSearch = useRef('')` mantiene el termino activo sin generar re-renders, permitiendo que las funciones de mutacion accedan al valor actual sin stale closure.

### Migracion SQLite a PostgreSQL
Solo se modifica `backend/core/database/connection.js`. El resto del codigo no cambia.
