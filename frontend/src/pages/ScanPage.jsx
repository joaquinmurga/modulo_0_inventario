import { useState, useCallback, Component, useRef } from 'react';
import BlockSelector from '../components/BlockSelector';
import BarcodeScanner from '../components/BarcodeScanner';
import ProductModal from '../components/ProductModal';
import { useBarcodeScan } from '../hooks/useBarcodeScan';
import { api } from '../services/api';

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error) {
    console.error('ErrorBoundary:', error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-800 text-sm">
          <p>Error: {this.state.error?.message || 'Error desconocido'}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-2 bg-red-600 text-white px-3 py-1 rounded text-xs"
          >
            Recargar
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default function ScanPage() {
  const [block, setBlock] = useState('');
  const [cameraActive, setCameraActive] = useState(false);
  const [pendingBarcode, setPendingBarcode] = useState(null);
  const [lastScan, setLastScan] = useState(null);
  const processingRef = useRef(false); // Usar ref en lugar de estado

  const handleScan = useCallback(
    async (barcode) => {
      // Evitar duplicados
      if (!block || processingRef.current || barcode === lastScan?.barcode) return;

      processingRef.current = true;
      console.log('🔄 [ScanPage] handleScan iniciado:', { barcode, block });

      try {
        const { status, data } = await api.scan(barcode, block);
        console.log('✓ [ScanPage] API scan completado:', { status });

        if (status === 404) {
          console.log('❓ [ScanPage] Producto no encontrado');
          setPendingBarcode(barcode);
        } else {
          console.log('✓ [ScanPage] Producto registrado:', data.product.name);
          setLastScan({ barcode, product: data.product, action: 'registered' });
        }

        console.log('⏹️ [ScanPage] Deteniendo cámara...');
        setCameraActive(false); // Detener cámara después de escaneo
      } catch (e) {
        console.error('✗ [ScanPage] Error en handleScan:', e);
      } finally {
        processingRef.current = false;
        console.log('✓ [ScanPage] handleScan completado');
      }
    },
    [block, lastScan] // Solo block y lastScan, NO processing
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
    <ErrorBoundary>
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
    </ErrorBoundary>
  );
}
