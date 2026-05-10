import { useState, useCallback, useRef, Component } from 'react';
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
  const [manualCode, setManualCode] = useState('');
  const [inputFocused, setInputFocused] = useState(false);
  const processingRef = useRef(false);

  const handleScan = useCallback(
    async (barcode) => {
      if (!block || processingRef.current || barcode === lastScan?.barcode) return;
      processingRef.current = true;

      try {
        const { status, data } = await api.scan(barcode, block);
        if (status === 404) {
          setPendingBarcode(barcode);
        } else {
          setLastScan({ barcode, product: data.product, action: 'registered' });
          setCameraActive(false);
        }
      } catch {
        // silencioso
      } finally {
        processingRef.current = false;
      }
    },
    [block, lastScan]
  );

  // Pistola laser — activa cuando el campo manual NO tiene foco y no hay modal abierto
  useBarcodeScan(handleScan, !!block && !pendingBarcode && !inputFocused);

  function handleManualSubmit(e) {
    e.preventDefault();
    const code = manualCode.trim();
    if (code) {
      setManualCode('');
      handleScan(code);
    }
  }

  async function handleNewProduct(productData) {
    await api.createProduct(productData);
    await api.scan(productData.barcode, block);
    setLastScan({ barcode: productData.barcode, product: productData, action: 'created' });
    setPendingBarcode(null);
    setCameraActive(false);
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
          <>
            {/* Entrada manual y camara */}
            <div className="bg-white rounded-xl shadow p-4 mb-4 space-y-4">

              {/* Input manual / pistola */}
              <div>
                <h2 className="font-semibold text-gray-700 mb-2">Codigo de barras</h2>
                <form onSubmit={handleManualSubmit} className="flex gap-2">
                  <input
                    type="text"
                    value={manualCode}
                    onChange={(e) => setManualCode(e.target.value)}
                    onFocus={() => setInputFocused(true)}
                    onBlur={() => setInputFocused(false)}
                    placeholder="Escribi o escanea con pistola laser..."
                    className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                  />
                  <button
                    type="submit"
                    className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 whitespace-nowrap"
                  >
                    Registrar
                  </button>
                </form>
                <p className="mt-1.5 text-xs text-gray-400">
                  La pistola laser funciona sin hacer clic si el campo no esta seleccionado.
                </p>
              </div>

              {/* Camara */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h2 className="font-semibold text-gray-700">Camara</h2>
                  <button
                    onClick={() => setCameraActive((v) => !v)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      cameraActive
                        ? 'bg-red-100 text-red-700 hover:bg-red-200'
                        : 'bg-green-100 text-green-700 hover:bg-green-200'
                    }`}
                  >
                    {cameraActive ? 'Detener camara' : 'Activar camara'}
                  </button>
                </div>
                <BarcodeScanner onScan={handleScan} active={cameraActive && !!block} />
                {!cameraActive && (
                  <p className="text-gray-400 text-sm text-center py-3">
                    Camara detenida.
                  </p>
                )}
              </div>
            </div>

            {/* Ultimo escaneo */}
            {lastScan && (
              <div className={`rounded-xl p-4 mb-4 text-sm font-medium ${
                lastScan.action === 'created'
                  ? 'bg-blue-50 border border-blue-200 text-blue-800'
                  : 'bg-green-50 border border-green-200 text-green-800'
              }`}>
                <div className="flex items-center justify-between">
                  <div>
                    {lastScan.action === 'created' ? 'Nuevo producto creado: ' : 'Registrado: '}
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
          </>
        )}

        {/* Modal producto nuevo — manual o con IA */}
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
