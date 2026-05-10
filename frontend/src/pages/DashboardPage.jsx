import { useEffect, useState, useCallback, useRef } from 'react';
import { api } from '../services/api';
import { useBarcodeScan } from '../hooks/useBarcodeScan';
import EditProductModal from '../components/EditProductModal';
import AdjustQtyModal from '../components/AdjustQtyModal';

export default function DashboardPage() {
  const [stock, setStock] = useState([]);
  const [blocks, setBlocks] = useState([]);
  const [selectedBlock, setSelectedBlock] = useState('');
  const [loading, setLoading] = useState(true);

  const [editProduct, setEditProduct] = useState(null);
  const [adjustProduct, setAdjustProduct] = useState(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createBarcode, setCreateBarcode] = useState('');

  const [scanInput, setScanInput] = useState('');
  const [scanFeedback, setScanFeedback] = useState(null);
  const inputRef = useRef(null);

  const modalsOpen = !!(editProduct || adjustProduct || showCreateModal);

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

  function handleBarcodeLookup(barcode) {
    const code = barcode.trim();
    if (!code) return;
    setScanInput('');

    const found = stock.find((r) => r.barcode === code);
    if (found) {
      setScanFeedback({ type: 'found', name: found.name });
      setAdjustProduct(found);
    } else {
      setScanFeedback({ type: 'notfound', code });
      setCreateBarcode(code);
      setShowCreateModal(true);
    }
    setTimeout(() => setScanFeedback(null), 3000);
  }

  function handleManualSubmit(e) {
    e.preventDefault();
    handleBarcodeLookup(scanInput);
  }

  // Pistola laser - activa solo cuando no hay modales abiertos
  useBarcodeScan(handleBarcodeLookup, !modalsOpen);

  async function handleSaveEdit({ id, name, category, description, price }) {
    await api.updateProduct(id, { name, category, description, price });
    setEditProduct(null);
    fetchData();
  }

  async function handleCreate({ barcode, name, category, description, price }) {
    await api.createProduct({ barcode, name, category, description, price });
    setShowCreateModal(false);
    setCreateBarcode('');
    fetchData();
  }

  async function handleDelete(id) {
    await api.deleteProduct(id);
    setConfirmDeleteId(null);
    fetchData();
  }

  async function handleAdjust(product_id, location_block, quantity) {
    await api.adjustQuantity(product_id, location_block, quantity);
    setAdjustProduct(null);
    fetchData();
  }

  const totalUnits = stock.reduce((s, r) => s + (r.total_quantity || 0), 0);

  return (
    <div>
      {editProduct && (
        <EditProductModal
          product={editProduct}
          onSave={handleSaveEdit}
          onClose={() => setEditProduct(null)}
        />
      )}
      {showCreateModal && (
        <EditProductModal
          product={null}
          initialBarcode={createBarcode}
          onSave={handleCreate}
          onClose={() => { setShowCreateModal(false); setCreateBarcode(''); }}
        />
      )}
      {adjustProduct && (
        <AdjustQtyModal
          product={adjustProduct}
          blocks={blocks.length ? blocks : ['General']}
          onSave={handleAdjust}
          onClose={() => setAdjustProduct(null)}
        />
      )}

      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Dashboard de Stock</h1>
        <div className="flex items-center gap-3">
          <button onClick={fetchData} className="text-sm text-indigo-600 hover:text-indigo-800 font-medium">
            Actualizar
          </button>
          <button
            onClick={() => { setCreateBarcode(''); setShowCreateModal(true); }}
            className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700"
          >
            + Nuevo producto
          </button>
        </div>
      </div>

      {/* Barra de escaneo */}
      <div className="bg-white rounded-xl shadow p-4 mb-6">
        <p className="text-xs font-medium text-gray-500 uppercase mb-2">Escanear o ingresar codigo</p>
        <form onSubmit={handleManualSubmit} className="flex gap-2">
          <input
            ref={inputRef}
            type="text"
            value={scanInput}
            onChange={(e) => setScanInput(e.target.value)}
            placeholder="Codigo de barras - escribi o usa pistola laser..."
            className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
          />
          <button
            type="submit"
            className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 whitespace-nowrap"
          >
            Buscar
          </button>
        </form>
        {scanFeedback && (
          <p className={`mt-2 text-xs font-medium ${scanFeedback.type === 'found' ? 'text-green-600' : 'text-yellow-600'}`}>
            {scanFeedback.type === 'found'
              ? `Producto encontrado: ${scanFeedback.name}`
              : `Codigo no registrado: ${scanFeedback.code} - Completa los datos para crearlo.`}
          </p>
        )}
      </div>

      {/* Resumen */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-white rounded-xl shadow p-4">
          <p className="text-xs text-gray-500 uppercase">Productos unicos</p>
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
          {blocks.map((b) => <option key={b} value={b}>{b}</option>)}
        </select>
      </div>

      {/* Tabla */}
      <div className="bg-white rounded-xl shadow overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-400">Cargando...</div>
        ) : stock.length === 0 ? (
          <div className="p-8 text-center text-gray-400">
            No hay productos aun. Usa el escaner o crea uno con el boton de arriba.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
                <tr>
                  <th className="px-4 py-3 text-left">Producto</th>
                  <th className="px-4 py-3 text-left">Categoria</th>
                  <th className="px-4 py-3 text-left">{selectedBlock ? 'Bloque' : 'Bloques'}</th>
                  <th className="px-4 py-3 text-right">Cantidad</th>
                  <th className="px-4 py-3 text-right">Precio</th>
                  <th className="px-4 py-3 text-right">Ultimo escaneo</th>
                  <th className="px-4 py-3 text-center">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {stock.map((row) => (
                  <tr key={`${row.product_id}-${row.location_block || 'all'}`} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-800">{row.name}</p>
                      <p className="text-xs text-gray-400">{row.barcode}</p>
                      {row.description && (
                        <p className="text-xs text-gray-400">{row.description}</p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-600">{row.category || '-'}</td>
                    <td className="px-4 py-3 text-gray-600">
                      {selectedBlock ? row.location_block : (row.blocks || '-')}
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-indigo-700">
                      {row.total_quantity}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-600">
                      {row.price > 0 ? `$${Number(row.price).toFixed(2)}` : '-'}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-400 text-xs">
                      {row.last_scan ? new Date(row.last_scan).toLocaleString('es-AR') : '-'}
                    </td>
                    <td className="px-4 py-3">
                      {confirmDeleteId === row.product_id ? (
                        <div className="flex items-center justify-center gap-2">
                          <span className="text-xs text-red-600 font-medium">Eliminar?</span>
                          <button
                            onClick={() => handleDelete(row.product_id)}
                            className="text-xs bg-red-600 text-white px-2 py-1 rounded font-medium hover:bg-red-700"
                          >
                            Si
                          </button>
                          <button
                            onClick={() => setConfirmDeleteId(null)}
                            className="text-xs text-gray-500 hover:text-gray-700"
                          >
                            No
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => setAdjustProduct(row)}
                            title="Ajustar cantidad"
                            className="p-1.5 rounded-lg text-green-600 hover:bg-green-50 transition-colors"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 11l5-5m0 0l5 5m-5-5v12" />
                            </svg>
                          </button>
                          <button
                            onClick={() => setEditProduct(row)}
                            title="Editar"
                            className="p-1.5 rounded-lg text-indigo-600 hover:bg-indigo-50 transition-colors"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => setConfirmDeleteId(row.product_id)}
                            title="Eliminar"
                            className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 transition-colors"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
