import { useEffect, useRef, useState } from 'react';

export default function BarcodeScanner({ onScan, active }) {
  const containerRef = useRef(null);
  const scannerRef = useRef(null);
  const [error, setError] = useState(null);
  const isMountedRef = useRef(true);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const stopScanner = async () => {
    if (!scannerRef.current) return;

    try {
      // Parar html5-qrcode
      await scannerRef.current.stop();
    } catch (e) {
      console.error('Error al detener scanner:', e);
    }

    try {
      // Limpiar html5-qrcode
      await scannerRef.current.clear();
    } catch (e) {
      console.error('Error al limpiar scanner:', e);
    }

    // Forzar parada de la cámara a nivel de navegador
    try {
      const video = containerRef.current?.querySelector('video');
      if (video && video.srcObject) {
        video.srcObject.getTracks().forEach((track) => {
          track.stop();
        });
        video.srcObject = null;
      }
    } catch (e) {
      console.error('Error al detener video tracks:', e);
    }

    scannerRef.current = null;

    // Limpiar DOM
    if (containerRef.current) {
      containerRef.current.innerHTML = '';
    }
  };

  useEffect(() => {
    // Parar si no está activo
    if (!active) {
      stopScanner();
      return;
    }

    // Iniciar cámara
    const initScanner = async () => {
      if (!isMountedRef.current) return;

      try {
        const { Html5Qrcode } = await import('html5-qrcode');

        // Recrear elemento qr-reader
        if (containerRef.current) {
          containerRef.current.innerHTML = '<div id="qr-reader" style="width: 100%;"></div>';
        }

        const scanner = new Html5Qrcode('qr-reader');
        scannerRef.current = scanner;

        await scanner.start(
          { facingMode: 'environment' },
          { fps: 10, qrbox: { width: 280, height: 180 } },
          (decodedText) => {
            if (isMountedRef.current) {
              onScan(decodedText);
            }
          },
          () => {}
        );

        if (isMountedRef.current) {
          setError(null);
        }
      } catch (err) {
        if (isMountedRef.current) {
          setError('No se pudo acceder a la cámara. Usa el escáner físico.');
        }
        scannerRef.current = null;
      }
    };

    initScanner();

    return () => {
      stopScanner();
    };
  }, [active, onScan]);

  if (!active) return null;

  return (
    <div className="rounded-xl overflow-hidden bg-black">
      <div ref={containerRef} style={{ width: '100%' }} />
      {error && (
        <p className="text-yellow-400 text-sm text-center py-3 px-4">{error}</p>
      )}
    </div>
  );
}
