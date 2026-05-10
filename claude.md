# FlexSaaS — Diario de Decisiones Técnicas

## Estado actual
- **Fecha de inicio:** 2026-05-10
- **Fase:** MVP — Módulo de Inventario (v1.0)
- **Estado:** MVP funcional — CRUD completo, escaneo dual, reconocimiento de imagen con IA

---

## Arquitectura general

FlexSaaS es una aplicación modular SaaS. Cada módulo es independiente y puede desarrollarse, desplegarse o reemplazarse sin afectar al resto.

```
inventario/
├── backend/
│   ├── core/
│   │   └── database/
│   │       ├── connection.js     # Abstraccion SQLite (db.run / db.get / db.all)
│   │       └── schema.js         # Creacion de tablas al arrancar
│   ├── modules/
│   │   └── inventory/
│   │       ├── model.js          # ProductModel + LogModel (SQL plano)
│   │       ├── controller.js     # Handlers Express (CRUD + scan + vision)
│   │       ├── routes.js         # Router montado en /api/inventory
│   │       └── visionService.js  # Gemini 3 Flash Preview + guardado en /uploads
│   ├── server.js                 # Express + CORS + dotenv + initSchema
│   └── package.json
├── frontend/
│   └── src/
│       ├── components/
│       │   ├── BarcodeScanner.jsx    # Camara con html5-qrcode (import dinamico)
│       │   ├── BlockSelector.jsx     # Selector de bloque (presets + input libre)
│       │   ├── ProductModal.jsx      # Modal nuevo producto: manual o IA
│       │   ├── EditProductModal.jsx  # Modal editar/crear producto (CRUD)
│       │   └── AdjustQtyModal.jsx   # Modal ajuste de cantidad (agregar/retirar)
│       ├── pages/
│       │   ├── ScanPage.jsx          # Escaneo: manual, pistola laser, camara
│       │   └── DashboardPage.jsx     # Stock con CRUD, filtros y escaneo rapido
│       ├── hooks/
│       │   └── useBarcodeScan.js     # Deteccion pistola HID por teclado (300ms)
│       ├── services/
│       │   └── api.js               # fetch centralizado (todos los endpoints)
│       └── App.jsx                  # BrowserRouter + Nav + Routes
├── uploads/                         # Imagenes capturadas (ignorado por git y Claude)
├── .env                             # Variables de entorno (no commiteado)
├── .env.example                     # Plantilla: GEMINI_API_KEY, PORT
├── .claudeignore                    # Excluye uploads/ y node_modules del contexto
├── claude.md                        # Este archivo
└── inventory-skill.md               # Contexto detallado del modulo
```

---

## Decisiones tecnicas

### Base de Datos
- **SQLite** para el MVP local. La capa de acceso a datos esta en `backend/core/database/connection.js`.
- **Decision clave:** Todo acceso a DB pasa por funciones genericas (`db.run`, `db.get`, `db.all`). Para migrar a PostgreSQL solo se modifica `connection.js`.
- Los logs son **append-only**: nunca se modifica stock directamente, se agregan entradas (incluso negativas para retiros). Esto permite auditoria historica.

### Backend
- **Express** con estructura modular: router montado en `/api/inventory`.
- Sin ORM: SQL plano para maximo control y portabilidad.
- Puerto por defecto: `3001`. Variable `PORT` lo sobreescribe.
- **dotenv** cargado en `server.js`. Body limit: `20mb` para soportar imagenes en base64.

### Frontend
- **Vite + React + Tailwind CSS**.
- **html5-qrcode** con `import()` dinamico para lazy load.
- Proxy de Vite redirige `/api` a `http://localhost:3001`.

### Escaneo dual (camara + pistola)
- Hook `useBarcodeScan`: detecta pistola HID via eventos `keydown` globales. Resetea buffer si pasan mas de 300ms entre teclas. Dispara en Enter.
- Cuando el campo de texto manual tiene foco, el hook global se deshabilita para evitar doble disparo.
- La camara se desactiva automaticamente tras cada escaneo exitoso.
- `processingRef = useRef(false)` evita doble procesamiento en callbacks memoizados.

### CRUD de productos
- Edicion y eliminacion desde el Dashboard con confirmacion inline.
- Eliminacion en cascada: primero borra logs, luego el producto.
- Ajuste de cantidad via logs con cantidad positiva (agregar) o negativa (retirar).
- El Dashboard usa LEFT JOIN para mostrar todos los productos aunque no tengan logs.

### Integracion de IA — Gemini Vision
- **Modelo:** `gemini-3-flash-preview` via SDK `@google/generative-ai`.
- **Variable de entorno:** `GEMINI_API_KEY`.
- El prompt instruye a devolver solo JSON plano (sin caracteres especiales ni emojis).
- Cada imagen analizada se guarda en `/uploads/<barcode>_<timestamp>.jpg`.
- El frontend ofrece dos opciones: tomar foto en vivo (getUserMedia) o seleccionar archivo.

### Flujo de escaneo
1. Usuario selecciona bloque.
2. Ingresa codigo: campo manual, pistola laser o camara.
3. `POST /scan`: existe → log (200); no existe → 404.
4. En 404 → ProductModal: completar manualmente o con IA (foto o archivo).
5. Al confirmar → `POST /products` + `POST /scan`.

---

## Tareas completadas
- [x] Estructura de carpetas
- [x] Backend: connection.js, schema.js, model.js, controller.js, routes.js, server.js
- [x] Backend: CRUD completo (PUT /products/:id, DELETE /products/:id)
- [x] Backend: ajuste de cantidad (POST /logs/adjust)
- [x] Backend: visionService.js (Gemini 3 Flash Preview)
- [x] Frontend: BarcodeScanner, BlockSelector
- [x] Frontend: ProductModal (manual + IA con camara en vivo o archivo)
- [x] Frontend: EditProductModal (crear y editar)
- [x] Frontend: AdjustQtyModal (agregar/retirar por bloque)
- [x] Frontend: ScanPage (entrada manual, pistola laser, camara)
- [x] Frontend: DashboardPage (CRUD, escaneo rapido, filtros, LEFT JOIN)
- [x] Frontend: useBarcodeScan (pistola HID, umbral 300ms)
- [x] Frontend: api.js (todos los endpoints)
- [x] .claudeignore, .env.example

## Proximas tareas
- [ ] Tests de integracion basicos
- [ ] Autenticacion (futuro modulo /core/auth)
- [ ] Migracion a PostgreSQL cuando se escale
- [ ] Deploy con Docker Compose
