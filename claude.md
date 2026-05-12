# FlexSaaS — Diario de Decisiones Técnicas

## Estado actual
- **Fecha de inicio:** 2026-05-10
- **Ultima actualizacion:** 2026-05-12
- **Fase:** MVP — Módulo de Inventario (v1.0)
- **Estado:** MVP probado en emulador Android 14 — búsqueda server-side, modo escaneo dual, IA en edición

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
├── frontend/                     # Web app (Vite + React + Tailwind)
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
├── mobile/                       # App Android (Expo SDK 52 + Expo Router)
│   ├── app/
│   │   ├── index.jsx                 # Redirect a /(tabs)/scan (ruta raiz)
│   │   ├── _layout.jsx               # Stack root: solo (tabs)
│   │   └── (tabs)/
│   │       ├── _layout.jsx           # 3 tabs: Escanear, Stock, Ajustes
│   │       ├── scan.jsx              # Escaneo: modo dual + camara nativa continua
│   │       ├── dashboard.jsx         # Stock: FlatList + CRUD + busqueda server-side
│   │       └── settings_tab.jsx      # URL del servidor + test de conexion
│   ├── src/
│   │   ├── config.js                 # AsyncStorage: getServerUrl / setServerUrl
│   │   ├── api.js                    # URL configurable, error NO_SERVER
│   │   ├── theme.js                  # Colores, spacing, radius
│   │   └── components/
│   │       ├── NoServer.jsx          # Pantalla cuando no hay servidor configurado
│   │       ├── BarcodeScanner.jsx    # CameraView nativa (expo-camera)
│   │       ├── BlockSelector.jsx     # Presets + input libre (React Native)
│   │       └── ProductModal.jsx      # Camara/galeria + Gemini IA (expo-image-picker)
│   ├── package.json                  # Expo 52, expo-router, expo-camera, async-storage
│   ├── app.json                      # scheme: flexsaas, android package
│   └── babel.config.js
├── uploads/                         # Imagenes capturadas (ignorado por git y Claude)
├── .env                             # Variables de entorno (no commiteado)
├── .env.example                     # Plantilla: GEMINI_API_KEY, PORT
├── .claudeignore                    # Excluye uploads/ y node_modules del contexto
├── CLAUDE.md                        # Este archivo
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
- El backend escucha en `0.0.0.0` para aceptar conexiones de la app mobile en la LAN.

### Frontend Web
- **Vite + React + Tailwind CSS**.
- **html5-qrcode** con `import()` dinamico para lazy load.
- Proxy de Vite redirige `/api` a `http://localhost:3001` (solo en desarrollo).

### App Mobile (Android)
- **Expo SDK 52** con **Expo Router** (file-based routing, similar a Next.js).
- **expo-camera**: `CameraView` con escaneo nativo de barcodes (ean13, ean8, code128, etc.).
- **expo-image-picker**: camara y galeria para analisis con IA.
- **AsyncStorage**: persiste la URL del servidor entre sesiones (`@flexsaas:server_url`).
- La URL es configurable en la tab "Ajustes" — no hay proxy, el URL completo se construye en `api.js`.
- Error `NO_SERVER`: si no hay URL configurada, `api.js` lanza error con `code: 'NO_SERVER'`.
- **Emulador recomendado:** Android 14 (API 34) con Google Play. Android 15+ requiere alineacion de 16KB que Expo SDK 52 no cumple completamente.
- `expo-asset` debe instalarse por separado (`npx expo install expo-asset`) ademas del `npm install`.

### Separacion web / mobile
| Aspecto | Web (frontend/) | Mobile (mobile/) |
|---------|-----------------|-----------------|
| Routing | React Router | Expo Router |
| API URL | Proxy Vite `/api` | AsyncStorage + URL completa |
| Camara | getUserMedia + html5-qrcode | CameraView nativa |
| Imagenes | FileReader / getUserMedia | expo-image-picker |
| Storage | localStorage (N/A) | AsyncStorage |

### Escaneo dual (camara + pistola) — Web
- Hook `useBarcodeScan`: detecta pistola HID via eventos `keydown` globales. Resetea buffer si pasan mas de 300ms entre teclas. Dispara en Enter.
- Cuando el campo de texto manual tiene foco, el hook global se deshabilita para evitar doble disparo.
- `processingRef = useRef(false)` evita doble procesamiento en callbacks memoizados.

### Modo de escaneo — Mobile
- Control segmentado en scan.jsx: **"Solo escanear"** (default) / **"Escanear y completar"**.
- **Solo escanear**: codigo nuevo → crea producto con barcode como nombre provisional → registra log. Sin interrupciones, ideal para inventario masivo.
- **Escanear y completar**: codigo nuevo → abre `ProductModal` para completar datos manualmente o con IA.
- La camara **nunca se detiene** tras un escaneo — el feedback se muestra como banner y se sigue escaneando.

### Busqueda server-side — Mobile Dashboard
- `GET /logs?q=<texto>` filtra en SQLite por nombre, barcode y categoria (LIKE).
- Debounce de 400ms en el TextInput: no consulta el servidor en cada tecla.
- La data se carga solo al montar el componente; las mutaciones (crear/editar/eliminar) refetchean preservando el termino de busqueda activo via `currentSearch` ref.
- Evita cargar catalogos enteros de 20.000+ productos en memoria del dispositivo.

### CRUD de productos
- Edicion y eliminacion desde el Dashboard con confirmacion inline (web) o `Alert.alert` (mobile).
- Eliminacion en cascada: primero borra logs, luego el producto.
- Ajuste de cantidad via logs con cantidad positiva (agregar) o negativa (retirar).
- El Dashboard usa LEFT JOIN para mostrar todos los productos aunque no tengan logs.
- **Mobile:** `ProductFormModal` incluye botones "Tomar foto" y "Galeria" para rellenar campos con Gemini IA, tanto en modo creacion como edicion.

### Integracion de IA — Gemini Vision
- **Modelo:** `gemini-3-flash-preview` via SDK `@google/generative-ai`.
- **Variable de entorno:** `GEMINI_API_KEY`.
- El prompt instruye a devolver solo JSON plano (sin caracteres especiales ni emojis).
- Cada imagen analizada se guarda en `/uploads/<barcode>_<timestamp>.jpg`.
- **Web:** dos opciones: tomar foto en vivo (getUserMedia) o seleccionar archivo.
- **Mobile:** disponible en `ProductModal` (escaneo) y `ProductFormModal` (dashboard edit/create). Dos opciones: camara (launchCameraAsync) o galeria (launchImageLibraryAsync).

### Flujo de escaneo — Mobile
**Modo "Solo escanear":**
1. Usuario selecciona bloque.
2. Ingresa codigo (manual o camara continua).
3. `POST /scan`: existe → log, muestra feedback, sigue escaneando.
4. No existe (404) → crea producto con barcode como nombre → `POST /scan`. Sin interrupcion.

**Modo "Escanear y completar":**
1. Usuario selecciona bloque.
2. Ingresa codigo.
3. `POST /scan`: existe → log; no existe → abre `ProductModal`.
4. `ProductModal`: manual o IA (foto/galeria) → `POST /products` + `POST /scan`.

---

## Tareas completadas
- [x] Estructura de carpetas
- [x] Backend: connection.js, schema.js, model.js, controller.js, routes.js, server.js
- [x] Backend: CRUD completo (PUT /products/:id, DELETE /products/:id)
- [x] Backend: ajuste de cantidad (POST /logs/adjust)
- [x] Backend: visionService.js (Gemini 3 Flash Preview)
- [x] Backend: GET /health (test de conexion mobile)
- [x] Backend: busqueda server-side en GET /logs?q= (LIKE en nombre, barcode, categoria)
- [x] Frontend web: BarcodeScanner, BlockSelector
- [x] Frontend web: ProductModal (manual + IA con camara en vivo o archivo)
- [x] Frontend web: EditProductModal (crear y editar)
- [x] Frontend web: AdjustQtyModal (agregar/retirar por bloque)
- [x] Frontend web: ScanPage (entrada manual, pistola laser, camara)
- [x] Frontend web: DashboardPage (CRUD, escaneo rapido, filtros, LEFT JOIN)
- [x] Frontend web: useBarcodeScan (pistola HID, umbral 300ms)
- [x] Frontend web: api.js (todos los endpoints)
- [x] .claudeignore, .env.example
- [x] App mobile: estructura Expo SDK 52 + Expo Router
- [x] App mobile: index.jsx (redirect a /(tabs)/scan), _layout.jsx corregido
- [x] App mobile: config.js (AsyncStorage), api.js (URL configurable + ?q=), theme.js
- [x] App mobile: NoServer, BarcodeScanner, BlockSelector, ProductModal
- [x] App mobile: scan.jsx — modo dual (Solo escanear / Escanear y completar), camara continua
- [x] App mobile: dashboard.jsx — busqueda server-side debounced, IA en ProductFormModal
- [x] App mobile: settings_tab.jsx, layouts
- [x] App mobile: probado en emulador Android 14 (API 34), conectado a backend via 10.0.2.2

## Proximas tareas
- [ ] Tests de integracion basicos
- [ ] Autenticacion (futuro modulo /core/auth)
- [ ] Migracion a PostgreSQL cuando se escale
- [ ] Deploy con Docker Compose
- [ ] Multi-tenancy (organization_id en tablas)
- [ ] Paginacion en GET /logs para catalogos muy grandes (complemento a busqueda)

## Comandos utiles

```cmd
# Backend
cd C:\Users\BCtecnologia\Desktop\Joaquin\inventario\backend
node server.js

# Frontend web
cd C:\Users\BCtecnologia\Desktop\Joaquin\inventario\frontend
npm run dev

# App mobile
cd C:\Users\BCtecnologia\Desktop\Joaquin\inventario\mobile
npx expo start
# Luego presionar 'a' para abrir en emulador Android
```
