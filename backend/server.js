require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { initSchema } = require('./core/database/schema');
const inventoryRoutes = require('./modules/inventory/routes');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json({ limit: '20mb' }));

// Inicializar esquema de base de datos al arrancar
initSchema();

// Montar módulos
app.use('/api/inventory', inventoryRoutes);

app.get('/health', (req, res) => res.json({ status: 'ok', module: 'FlexSaaS Inventory' }));

app.listen(PORT, () => {
  console.log(`FlexSaaS Backend corriendo en http://localhost:${PORT}`);
});
