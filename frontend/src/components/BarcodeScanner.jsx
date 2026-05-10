import { useEffect, useRef, useState } from 'react';

export default function BarcodeScanner({ onScan, active }) {
  const containerRef = useRef(null);
  const scannerRef = useRef(null);
  const [error, setError] = useState(null);
  const [debug, setDebug] = useState({});

  const logState = (action, details = {}) => {
    const videoElement = containerRef.current?.querySelector('video');
    const state = {
      timestamp: new Date().toLocaleTimeString(),
      action,
      active,
      hasScannerRef: !!scannerRef.current,
      hasVideo: !!videoElement,
      videoSrcObject: !!videoElement?.srcObject,
      videoSrcObjectTracks: videoElement?.srcObject?.getTracks().length || 0,
      containerHTML: containerRef.current?.innerHTML?.substring(0, 50) || 'empty',
      ...details,
    };

    // Imprimir en consola de forma clara
    console.group(`📸 [BarcodeScanner] ${action}`);
    console.table(state);
    console.groupEnd();

    setDebug(state);
  };

  useEffect(() => {
    console.clear();
    console.log('========================================');
    console.log('🎬 BARCODE SCANNER EFFECT INICIADO');
    console.log('========================================');

    logState('EFFECT_START', {
      dependencyActive: active,
      containerExists: !!containerRef.current,
    });

    if (!active) {
      console.log('⏹️ DETIENDO CÁMARA...');
      logState('STOPPING_CAMERA');

      // Parar cámara
      if (scannerRef.current) {
        console.log('📹 Llamando a scanner.stop()');
        scannerRef.current
          .stop()
          .then(() => {
            console.log('✓ scanner.stop() completado');
            logState('SCANNER_STOPPED');
            return scannerRef.current?.clear();
          })
          .catch((e) => {
            console.error('✗ Error en scanner.stop():', e.message);
            logState('SCANNER_STOP_ERROR', { error: e.message });
          });
        scannerRef.current = null;
        console.log('🔄 scannerRef.current = null');
      }

      // Detener video tracks manualmente
      const video = containerRef.current?.querySelector('video');
      console.log('🎥 Buscando elemento <video>:', !!video);
      logState('LOOKING_FOR_VIDEO', { found: !!video });

      if (video?.srcObject) {
        const tracks = video.srcObject.getTracks();
        console.log(`📊 Encontradas ${tracks.length} tracks`);
        logState('STOPPING_TRACKS', { trackCount: tracks.length });

        tracks.forEach((track, index) => {
          console.log(
            `  Track ${index}: kind=${track.kind}, enabled=${track.enabled}, readyState=${track.readyState}`
          );
          track.stop();
          console.log(`  ✓ Track ${index} detenido`);
        });

        video.srcObject = null;
        console.log('🔄 video.srcObject = null');
      }

      // Limpiar contenedor
      if (containerRef.current) {
        containerRef.current.innerHTML = '';
        console.log('🧹 Contenedor limpiado');
        logState('CONTAINER_CLEARED');
      }

      console.log('✓ CÁMARA COMPLETAMENTE DETENIDA');
      console.log('========================================');
      return;
    }

    // Iniciar cámara
    const startScanner = async () => {
      console.log('▶️ INICIANDO CÁMARA...');
      logState('STARTING_SCANNER');

      try {
        console.log('📦 Importando Html5Qrcode...');
        const { Html5Qrcode } = await import('html5-qrcode');
        console.log('✓ Html5Qrcode importado');

        // Recrear contenedor
        if (containerRef.current) {
          containerRef.current.innerHTML = '<div id="qr-reader" style="width: 100%;"></div>';
          console.log('✓ Contenedor qr-reader recreado');
          logState('CONTAINER_RECREATED');
        }

        console.log('🔨 Creando instancia de Html5Qrcode...');
        const scanner = new Html5Qrcode('qr-reader');
        scannerRef.current = scanner;
        console.log('✓ Scanner creado');
        logState('SCANNER_CREATED');

        console.log('🎬 Iniciando scanner.start()...');
        await scanner.start(
          { facingMode: 'environment' },
          { fps: 10, qrbox: { width: 280, height: 180 } },
          (decodedText) => {
            console.log('🎯 QR DETECTADO:', decodedText);
            logState('QR_DETECTED', { barcode: decodedText });
            try {
              onScan(decodedText);
              console.log('✓ onScan() ejecutado correctamente');
            } catch (e) {
              console.error('✗ Error en onScan():', e.message);
              logState('ONSCAN_ERROR', { error: e.message });
            }
          },
          () => {}
        );

        setError(null);
        console.log('✓ SCANNER INICIADO EXITOSAMENTE');
        logState('SCANNER_STARTED_SUCCESS');
        console.log('========================================');
      } catch (err) {
        console.error('✗ ERROR al iniciar scanner:', err.message);
        logState('SCANNER_START_FAILED', { error: err.message });
        setError('No se pudo acceder a la cámara. Usa el escáner físico.');
        scannerRef.current = null;
        console.log('========================================');
      }
    };

    startScanner();

    return () => {
      console.log('🧹 CLEANUP - Ejecutando cleanup del effect');
      logState('CLEANUP_START');
      try {
        if (scannerRef.current) {
          console.log('📹 Deteniendo scanner en cleanup...');
          scannerRef.current.stop().catch(() => {});
        }
      } catch (e) {
        console.error('✗ Error en cleanup:', e.message);
        logState('CLEANUP_ERROR', { error: e.message });
      }
      scannerRef.current = null;
      logState('CLEANUP_DONE');
      console.log('========================================');
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
          🔍 Estado de cámara (ver consola F12 para logs completos)
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
            <span className="text-blue-400">Tracks activos:</span> {debug.videoSrcObjectTracks}
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
