# FlexSaaS — Diario de Decisiones Técnicas

## Estado actual
- **Fecha de inicio:** 2026-05-10
- **Fase:** MVP — Módulo de Inventario (v1.0)
- **Estado:** En construcción inicial

---

## Arquitectura general

FlexSaaS es una aplicación modular SaaS. Cada módulo es independiente y puede desarrollarse, desplegarse o reemplazarse sin afectar al resto.

```
inventario/
├── backend/
│   ├── core/            # Infraestructura compartida (DB, server, middleware)
│   │   └── database/    # Capa de abstracción de base de datos
│   └── modules/
│       └── inventory/   # Módulo de Inventario (rutas, controlador, modelo)
├── frontend/
│   └── src/
│       ├── components/  # Componentes reutilizables
│       ├── pages/       # Vistas principales
│       ├── hooks/       # Custom hooks
│       └── services/    # Llamadas a la API
├── claude.md            # Este archivo
└── inventory-skill.md   # Contexto del módulo de inventario
```

---

## Decisiones técnicas

### Base de Datos
- **SQLite** para el MVP local. La capa de acceso a datos está en `backend/core/database/connection.js`.
- **Decisión clave:** Todo acceso a DB pasa por funciones genéricas (`db.run`, `db.get`, `db.all`) en lugar de llamadas directas. Esto permite reemplazar SQLite por PostgreSQL solo cambiando `connection.js`, sin tocar la lógica de negocio.

### Backend
- **Express** con estructura modular: cada módulo expone su propio router montado en `/api/inventory`.
- Sin ORM deliberadamente: SQL plano en los modelos para máximo control y portabilidad.

### Frontend
- **Vite + React + Tailwind CSS**.
- **html5-qrcode** para escaneo de cámara. El scanner de pistola (HID) se captura como input de teclado normal (termina en Enter) mediante un hook personalizado `useBarcodeScan`.
- Comunicación con el backend vía `fetch` centralizado en `src/services/api.js`.

### Escaneo dual (cámara + pistola)
- La pistola de escaneo actúa como teclado: escribe el código y presiona Enter muy rápido.
- El hook `useBarcodeScan` detecta si los caracteres llegan muy rápido (< 50ms entre teclas) para distinguir una pistola de un humano escribiendo.

---

## Tareas completadas
- [x] Estructura de carpetas
- [x] Archivos de contexto (claude.md, inventory-skill.md)
- [x] Backend: connection.js (SQLite)
- [x] Backend: schema.js (creación de tablas)
- [x] Backend: modelo de inventario
- [x] Backend: controlador de inventario
- [x] Backend: rutas de inventario
- [x] Backend: server.js
- [x] Backend: package.json
- [x] Frontend: package.json + vite.config.js
- [x] Frontend: tailwind.config.js
- [x] Frontend: componente BarcodeScanner
- [x] Frontend: hook useBarcodeScan
- [x] Frontend: servicio api.js
- [x] Frontend: página ScanPage
- [x] Frontend: página DashboardPage
- [x] Frontend: App.jsx con routing

## Próximas tareas
- [ ] Tests de integración básicos
- [ ] Autenticación (futuro módulo /core/auth)
- [ ] Migración a PostgreSQL cuando se escale
- [ ] Deploy con Docker Compose
