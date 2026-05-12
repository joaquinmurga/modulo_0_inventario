import { getServerUrl } from './config';

async function request(path, options = {}) {
  const base = await getServerUrl();

  if (!base) {
    const err = new Error('Servidor no configurado. Ve a Ajustes para configurarlo.');
    err.code = 'NO_SERVER';
    throw err;
  }

  const res = await fetch(`${base}/api/inventory${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });

  const data = await res.json();
  if (!res.ok && res.status !== 404) throw new Error(data.error || 'Error del servidor');
  return { status: res.status, data };
}

export const api = {
  scan: (barcode, location_block, quantity = 1) =>
    request('/scan', { method: 'POST', body: JSON.stringify({ barcode, location_block, quantity }) }),

  createProduct: (product) =>
    request('/products', { method: 'POST', body: JSON.stringify(product) }),

  updateProduct: (id, data) =>
    request(`/products/${id}`, { method: 'PUT', body: JSON.stringify(data) }),

  deleteProduct: (id) =>
    request(`/products/${id}`, { method: 'DELETE' }),

  adjustQuantity: (product_id, location_block, quantity) =>
    request('/logs/adjust', { method: 'POST', body: JSON.stringify({ product_id, location_block, quantity }) }),

  getLogs: (block = null, q = null) => {
    const params = new URLSearchParams();
    if (block) params.set('block', block);
    if (q && q.trim()) params.set('q', q.trim());
    const qs = params.toString();
    return request(`/logs${qs ? `?${qs}` : ''}`);
  },

  getBlocks: () => request('/blocks'),

  analyzeImage: (image, mimeType, barcode) =>
    request('/analyze-image', { method: 'POST', body: JSON.stringify({ image, mimeType, barcode }) }),

  testConnection: async () => {
    const base = await getServerUrl();
    if (!base) throw new Error('NO_SERVER');
    const res = await fetch(`${base}/health`);
    return res.json();
  },
};
