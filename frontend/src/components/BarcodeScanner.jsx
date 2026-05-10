import { useEffect, useRef, useState } from 'react';

export default function BarcodeScanner({ onScan, active }) {
  const containerRef = useRef(null);
  const scannerRef = useRef(null);
  const [error, setError] = useState(null);
  const [debug, setDebug] = useState({});

  const logState = (action, details = {}) => {
    const state = {
      timestamp: new Date().toLocaleTimeString(),
      action,
      active,
      hasScannerRef: !!scannerRef.current,
      hasVideo: !!containerRef.current?.querySelector('video'),
      videoSrcObject: !!containerRef.current?.querySelector('video')?.srcObject,
      containerHTML: containerRef.current?.innerHTML?.substring(0, 50) || 'empty',
      ...details,
    };
    console.log('📸 [BarcodeScanner]', state);
    setDebug(state);
  };

  useEffect(() => {
    logState('EFFECT_START', { dependencyActive: active });

    if (!active) {
      logState('STOPPING_CAMERA');

      // Parar cámara
      if (scannerRef.current) {
        scannerRef.current
          .stop()
          .then(() => {
            logState('SCANNER_STOPPED');
            return scannerRef.current?.clear();
          })
          .catch((e) => {
            logState('SCANNER_STOP_ERROR', { error: e.message });
          });
        scannerRef.current = null;
      }

      // Detener video tracks manualmente
      const video = containerRef.current?.querySelector('video');
      logState('LOOKING_FOR_VIDEO', { found: !!video });

      if (video?.srcObject) {
        logState('STOPPING_TRACKS', {
          trackCount: video.srcObject.getTracks().length,
        });
        video.srcObject.getTracks().forEach((track) => {
          logState('STOPPING_TRACK', { trackKind: track.kind, enabled: track.enabled });
          track.stop();
        });
      }

      // Limpiar contenedor
      if (containerRef.current) {
        containerRef.current.innerHTML = '';
        logState('CONTAINER_CLEARED');
      }
      return;
    }

    // Iniciar cámara
    const startScanner = async () => {
      logState('STARTING_SCANNER');

      try {
        const { Html5Qrcode } = await import('html5-qrcode');

        // Recrear contenedor
        if (containerRef.current) {
          containerRef.current.innerHTML = '<div id="qr-reader" style="width: 100%;"></div>';
          logState('CONTAINER_RECREATED');
        }

        const scanner = new Html5Qrcode('qr-reader');
        scannerRef.current = scanner;
        logState('SCANNER_CREATED');

        await scanner.start(
          { facingMode: 'environment' },
          { fps: 10, qrbox: { width: 280, height: 180 } },
          (decodedText) => {
            logState('QR_DETECTED', { barcode: decodedText });
            try {
              onScan(decodedText);
            } catch (e) {
              logState('ONSCAN_ERROR', { error: e.message });
            }
          },
          () => {}
        );

        setError(null);
        logState('SCANNER_STARTED_SUCCESS');
      } catch (err) {
        logState('SCANNER_START_FAILED', { error: err.message });
        setError('No se pudo acceder a la cámara. Usa el escáner físico.');
        scannerRef.current = null;
      }
    };

    startScanner();

    return () => {
      logState('CLEANUP_START');
      try {
        if (scannerRef.current) {
          scannerRef.current.stop().catch(() => {});
        }
      } catch (e) {
        logState('CLEANUP_ERROR', { error: e.message });
      }
      scannerRef.current = null;
      logState('CLEANUP_DONE');
    };
  }, [active, onScan]);

  if (!active) return null;

  return (
    <div className="space-y-2">
      <div className="rounded-xl overflow-hidden bg-black">
        <div ref={containerRef} style={{ width: '100%' }} />
        {error && (
          <p className="text-yellow-400 text-sm text-center py-3 px-4">{error}</p>
        )}
      </div>

      {/* Panel de debug */}
      <details className="bg-gray-900 text-gray-100 text-xs rounded p-2 font-mono">
        <summary className="cursor-pointer text-gray-400 hover:text-gray-300">
          🔍 Estado de cámara
        </summary>
        <div className="mt-2 space-y-1 text-gray-300">
          <div>
            <span className="text-blue-400">Activo:</span> {String(active)}
          </div>
          <div>
            <span className="text-blue-400">Scanner ref:</span> {debug.hasScannerRef ? '✓' : '✗'}
          </div>
          <div>
            <span className="text-blue-400">Video element:</span> {debug.hasVideo ? '✓' : '✗'}
          </div>
          <div>
            <span className="text-blue-400">srcObject:</span> {debug.videoSrcObject ? '✓' : '✗'}
          </div>
          <div>
            <span className="text-blue-400">Última acción:</span> {debug.action}
          </div>
          <div>
            <span className="text-blue-400">Timestamp:</span> {debug.timestamp}
          </div>
        </div>
      </details>
    </div>
  );
}
