# FlexSaaS — Módulo de Inventario

Sistema de inventario modular con soporte web y Android. Permite escanear productos con pistola láser, cámara o entrada manual, registrar stock por bloques/ubicaciones y completar datos de productos con reconocimiento de imagen por IA.

---

## Estado del proyecto

| Campo | Detalle |
|-------|---------|
| Fase | MVP v1.0 — Módulo de Inventario |
| Última actualización | 2026-05-12 |
| Backend | Funcional — Express + SQLite |
| Frontend web | Funcional — Vite + React + Tailwind |
| App Android | Probada en emulador Android 14 (API 34) |

---

## Features actuales

### Escaneo de productos
- **Tres métodos de entrada**: campo manual, pistola láser HID, cámara (web y Android nativo)
- **Modo "Solo escanear"** (default en Android): ideal para inventario masivo — si el código no existe, crea el producto automáticamente con el código como nombre provisional y sigue sin interrumpir
- **Modo "Escanear y completar"**: al detectar un código nuevo abre formulario para cargar datos del producto
- La cámara **no se detiene** tras cada escaneo — el feedback aparece como banner y se continúa escaneando
- Organización por **bloques/ubicaciones** (Góndola, Vitrina, Depósito, etc.)

### Reconocimiento de imagen con IA (Gemini)
- Tomar foto o seleccionar desde galería (web y Android)
- Gemini analiza la imagen y rellena automáticamente: nombre, categoría, descripción
- Disponible al crear un producto nuevo y al editar uno existente

### Dashboard de stock
- Vista de todos los productos con cantidad total por bloque
- **Búsqueda server-side** con debounce 400ms — consulta SQLite directamente, sin cargar todo el catálogo en memoria (apto para 20.000+ productos)
- CRUD completo: crear, editar (con IA), ajustar cantidad (agregar/retirar), eliminar
- Stats en tiempo real: total de productos y total de unidades
- Confirmación antes de eliminar

### App Android
- 3 tabs: **Escanear**, **Stock**, **Ajustes**
- URL del backend configurable desde la app (AsyncStorage)
- Test de conexión integrado en Ajustes
- Sin proxy — se conecta directo al backend via IP de red local

### Auditoría
- El stock es la suma de logs `append-only` — nunca se modifica directamente
- Historial completo de movimientos (entradas y retiros)
- Los retiros se registran como cantidades negativas

---

## Arquitectura

```
inventario/
├── backend/                      # API REST — Node.js + Express
│   ├── core/database/
│   │   ├── connection.js         # Abstracción SQLite (db.run / db.get / db.all)
│   │   └── schema.js             # Creación de tablas al arrancar
│   ├── modules/inventory/
│   │   ├── model.js              # ProductModel + LogModel (SQL plano)
│   │   ├── controller.js         # Handlers Express
│   │   ├── routes.js             # Router en /api/inventory
│   │   └── visionService.js      # Gemini 3 Flash Preview
│   └── server.js                 # Express + CORS + dotenv
│
├── frontend/                     # Web app — Vite + React + Tailwind
│   └── src/
│       ├── components/           # BarcodeScanner, BlockSelector, Modales
│       ├── pages/                # ScanPage, DashboardPage
│       ├── hooks/useBarcodeScan  # Detección pistola HID (umbral 300ms)
│       └── services/api.js       # fetch centralizado
│
├── mobile/                       # Android — Expo SDK 52 + Expo Router
│   ├── app/
│   │   ├── index.jsx             # Redirect a /(tabs)/scan
│   │   ├── _layout.jsx           # Stack root
│   │   └── (tabs)/
│   │       ├── scan.jsx          # Escaneo: modo dual + cámara continua
│   │       ├── dashboard.jsx     # Stock: búsqueda server-side + CRUD + IA
│   │       └── settings_tab.jsx  # URL del servidor + test conexión
│   └── src/
│       ├── api.js                # URL configurable, parámetro ?q=
│       ├── config.js             # AsyncStorage
│       ├── theme.js              # Colores, spacing, radius
│       └── components/           # NoServer, BarcodeScanner, BlockSelector, ProductModal
│
├── .env.example                  # Plantilla de variables de entorno
└── uploads/                      # Imágenes analizadas (ignorado por git)
```

### Stack tecnológico

| Capa | Tecnología |
|------|-----------|
| Backend | Node.js, Express, SQLite (better-sqlite3) |
| Frontend web | Vite, React, Tailwind CSS, html5-qrcode |
| App Android | Expo SDK 52, Expo Router, expo-camera, expo-image-picker |
| IA | Google Gemini 3 Flash Preview (`@google/generative-ai`) |
| Persistencia mobile | AsyncStorage |

---

## API

Base URL: `http://localhost:3001`

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/health` | Test de conexión |
| GET | `/api/inventory/products` | Lista todos los productos |
| POST | `/api/inventory/products` | Crea producto |
| PUT | `/api/inventory/products/:id` | Edita producto |
| DELETE | `/api/inventory/products/:id` | Elimina producto y sus logs |
| POST | `/api/inventory/scan` | Registra escaneo (200 existe / 404 no existe) |
| GET | `/api/inventory/logs` | Stock agregado. Soporta `?q=texto` y `?block=X` |
| GET | `/api/inventory/blocks` | Lista de bloques con actividad |
| POST | `/api/inventory/logs/adjust` | Ajusta cantidad (positivo/negativo) |
| POST | `/api/inventory/analyze-image` | Analiza imagen con Gemini |

---

## Cómo correr el proyecto

### Requisitos previos
- Node.js 18+
- Clave de API de Google Gemini (`GEMINI_API_KEY`)
- Para la app Android: Expo Go instalado en el dispositivo/emulador

### 1. Variables de entorno

```bash
cp .env.example .env
# Editar .env y completar GEMINI_API_KEY
```

### 2. Backend

```bash
cd backend
npm install
node server.js
# Corre en http://localhost:3001
```

### 3. Frontend web

```bash
cd frontend
npm install
npm run dev
# Corre en http://localhost:5173
```

### 4. App Android

```bash
cd mobile
npm install
npx expo install expo-asset
npx expo start
# Presionar 'a' para abrir en emulador Android
```

Una vez abierta la app, ir a la tab **Ajustes** y configurar la URL del backend:
- Emulador Android: `http://10.0.2.2:3001`
- Dispositivo físico: `http://<IP-LAN-del-PC>:3001`

---

## Roadmap

### Completado
- [x] Backend: CRUD completo, escaneo, ajuste de stock, búsqueda server-side
- [x] Backend: integración Gemini Vision (análisis de imagen)
- [x] Frontend web: escaneo dual (cámara + pistola), CRUD, IA
- [x] App Android: escaneo modo dual, cámara continua, búsqueda server-side, IA en edición
- [x] App Android: probada en emulador Android 14 (API 34)

### Próximos pasos
- [ ] Paginación en `GET /logs` (complemento a búsqueda para catálogos muy grandes)
- [ ] Tests de integración básicos
- [ ] Autenticación (módulo `/core/auth`)
- [ ] Deploy con Docker Compose
- [ ] Migración a PostgreSQL

### Alcance futuro (FlexSaaS)
- [ ] Multi-tenancy (`organization_id` en tablas)
- [ ] Módulo de ventas
- [ ] Módulo de proveedores
- [ ] Reportes y exportación a Excel/PDF
- [ ] Notificaciones de stock bajo
- [ ] App iOS

---

## Notas de diseño

**¿Por qué SQLite?**
Para el MVP local es suficiente y elimina dependencias de infraestructura. La capa de acceso (`connection.js`) está abstraída — migrar a PostgreSQL solo requiere modificar ese archivo.

**¿Por qué logs append-only?**
El stock nunca se modifica directamente. Cada entrada o retiro es un log con cantidad positiva o negativa. Esto permite auditoría histórica completa y simplifica la lógica de concurrencia.

**¿Por qué búsqueda server-side y no cargar todo?**
Con catálogos de 20.000+ productos, cargar todo al dispositivo móvil es lento e ineficiente. SQLite hace el filtro LIKE directamente en el servidor y devuelve solo los resultados relevantes.
