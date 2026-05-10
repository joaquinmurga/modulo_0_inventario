import { useEffect, useState, useCallback } from 'react';
import { api } from '../services/api';

export default function DashboardPage() {
  const [stock, setStock] = useState([]);
  const [blocks, setBlocks] = useState([]);
  const [selectedBlock, setSelectedBlock] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [stockRes, blocksRes] = await Promise.all([
      api.getLogs(selectedBlock || null),
      api.getBlocks(),
    ]);
    setStock(stockRes.data);
    setBlocks(blocksRes.data);
    setLoading(false);
  }, [selectedBlock]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const totalUnits = stock.reduce((s, r) => s + (r.total_quantity || 0), 0);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Dashboard de Stock</h1>
        <button
          onClick={fetchData}
          className="text-sm text-indigo-600 hover:text-indigo-800 font-medium"
        >
          Actualizar
        </button>
      </div>

      {/* Resumen */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-white rounded-xl shadow p-4">
          <p className="text-xs text-gray-500 uppercase">Productos únicos</p>
          <p className="text-3xl font-bold text-indigo-600">{stock.length}</p>
        </div>
        <div className="bg-white rounded-xl shadow p-4">
          <p className="text-xs text-gray-500 uppercase">Unidades totales</p>
          <p className="text-3xl font-bold text-indigo-600">{totalUnits}</p>
        </div>
      </div>

      {/* Filtro por bloque */}
      <div className="bg-white rounded-xl shadow p-4 mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">Filtrar por bloque</label>
        <select
          value={selectedBlock}
          onChange={(e) => setSelectedBlock(e.target.value)}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
        >
          <option value="">Todos los bloques</option>
          {blocks.map((b) => (
            <option key={b} value={b}>{b}</option>
          ))}
        </select>
      </div>

      {/* Tabla de stock */}
      <div className="bg-white rounded-xl shadow overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-400">Cargando...</div>
        ) : stock.length === 0 ? (
          <div className="p-8 text-center text-gray-400">
            No hay registros aún. Escanea productos para verlos aquí.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
              <tr>
                <th className="px-4 py-3 text-left">Producto</th>
                <th className="px-4 py-3 text-left">Categoría</th>
                {selectedBlock
                  ? <th className="px-4 py-3 text-left">Bloque</th>
                  : <th className="px-4 py-3 text-left">Bloques</th>
                }
                <th className="px-4 py-3 text-right">Cantidad</th>
                <th className="px-4 py-3 text-right">Último escaneo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {stock.map((row) => (
                <tr key={`${row.product_id}-${row.location_block || 'all'}`} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-800">{row.name}</p>
                    <p className="text-xs text-gray-400">{row.barcode}</p>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{row.category || '—'}</td>
                  <td className="px-4 py-3 text-gray-600">
                    {selectedBlock ? row.location_block : (row.blocks || '—')}
                  </td>
                  <td className="px-4 py-3 text-right font-bold text-indigo-700">
                    {row.total_quantity}
                  </td>
                  <td className="px-4 py-3 text-right text-gray-400 text-xs">
                    {row.last_scan
                      ? new Date(row.last_scan).toLocaleString('es-AR')
                      : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
