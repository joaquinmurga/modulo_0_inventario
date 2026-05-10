import { useState, useCallback } from 'react';
import BlockSelector from '../components/BlockSelector';
import BarcodeScanner from '../components/BarcodeScanner';
import ProductModal from '../components/ProductModal';
import { useBarcodeScan } from '../hooks/useBarcodeScan';
import { api } from '../services/api';

export default function ScanPage() {
  const [block, setBlock] = useState('');
  const [cameraActive, setCameraActive] = useState(false);
  const [pendingBarcode, setPendingBarcode] = useState(null);
  const [lastScan, setLastScan] = useState(null);
  const [processing, setProcessing] = useState(false);

  const handleScan = useCallback(
    async (barcode) => {
      if (!block || processing || barcode === lastScan?.barcode) return;
      setProcessing(true);

      const { status, data } = await api.scan(barcode, block);

      if (status === 404) {
        setPendingBarcode(barcode);
      } else {
        setLastScan({ barcode, product: data.product, action: 'registered' });
      }

      setCameraActive(false); // Detener cámara después de escaneo
      setProcessing(false);
    },
    [block, processing, lastScan]
  );

  // Escáner físico (pistola HID)
  useBarcodeScan(handleScan, !!block && !pendingBarcode);

  async function handleNewProduct(productData) {
    await api.createProduct(productData);
    await api.scan(productData.barcode, block);
    setLastScan({ barcode: productData.barcode, product: productData, action: 'created' });
    setPendingBarcode(null);
    setCameraActive(false); // Detener cámara después de crear producto
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Escaneo de Inventario</h1>

      <BlockSelector value={block} onChange={setBlock} />

      {!block && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 text-yellow-800 text-sm">
          Selecciona un bloque de escaneo para comenzar.
        </div>
      )}

      {block && (
        <div className="bg-white rounded-xl shadow p-4 mb-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-gray-700">Cámara</h2>
            <button
              onClick={() => setCameraActive((v) => !v)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                cameraActive
                  ? 'bg-red-100 text-red-700 hover:bg-red-200'
                  : 'bg-green-100 text-green-700 hover:bg-green-200'
              }`}
            >
              {cameraActive ? 'Detener cámara' : 'Activar cámara'}
            </button>
          </div>

          <BarcodeScanner onScan={handleScan} active={cameraActive && !!block} />

          {!cameraActive && (
            <p className="text-gray-400 text-sm text-center py-6">
              Cámara detenida. El escáner físico sigue activo.
            </p>
          )}
        </div>
      )}

      {lastScan && (
        <div className={`rounded-xl p-4 mb-4 text-sm font-medium ${
          lastScan.action === 'created'
            ? 'bg-blue-50 border border-blue-200 text-blue-800'
            : 'bg-green-50 border border-green-200 text-green-800'
        }`}>
          <div className="flex items-center justify-between">
            <div>
              {lastScan.action === 'created' ? '✦ Nuevo producto creado: ' : '✓ Registrado: '}
              <strong>{lastScan.product.name}</strong>
              <span className="text-xs ml-2 opacity-70">({lastScan.barcode})</span>
            </div>
            {!cameraActive && (
              <button
                onClick={() => setCameraActive(true)}
                className="ml-4 px-3 py-1 bg-opacity-20 bg-current rounded text-xs font-semibold hover:bg-opacity-30 transition-all whitespace-nowrap"
              >
                Continuar escaneando
              </button>
            )}
          </div>
        </div>
      )}

      {pendingBarcode && (
        <ProductModal
          barcode={pendingBarcode}
          onConfirm={handleNewProduct}
          onCancel={() => setPendingBarcode(null)}
        />
      )}
    </div>
  );
}
