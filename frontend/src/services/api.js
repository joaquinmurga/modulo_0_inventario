const BASE = '/api/inventory';

async function request(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  const data = await res.json();
  if (!res.ok && res.status !== 404) throw new Error(data.error || 'Error del servidor');
  return { status: res.status, data };
}

export const api = {
  scan: (barcode, location_block, quantity = 1) =>
    request('/scan', {
      method: 'POST',
      body: JSON.stringify({ barcode, location_block, quantity }),
    }),

  createProduct: (product) =>
    request('/products', {
      method: 'POST',
      body: JSON.stringify(product),
    }),

  getLogs: (block = null) =>
    request(block ? `/logs?block=${encodeURIComponent(block)}` : '/logs'),

  getBlocks: () => request('/blocks'),
};
