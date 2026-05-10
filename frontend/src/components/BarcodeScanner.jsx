import { useEffect, useRef, useState } from 'react';

export default function BarcodeScanner({ onScan, active }) {
  const containerRef = useRef(null);
  const scannerRef = useRef(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!active) {
      // Parar cámara
      if (scannerRef.current) {
        scannerRef.current
          .stop()
          .then(() => scannerRef.current?.clear())
          .catch((e) => console.error('Error stopping:', e));
        scannerRef.current = null;
      }

      // Detener video tracks manualmente
      const video = containerRef.current?.querySelector('video');
      if (video?.srcObject) {
        video.srcObject.getTracks().forEach((track) => track.stop());
      }

      // Limpiar contenedor
      if (containerRef.current) {
        containerRef.current.innerHTML = '';
      }
      return;
    }

    // Iniciar cámara
    const startScanner = async () => {
      try {
        const { Html5Qrcode } = await import('html5-qrcode');

        // Recrear contenedor
        if (containerRef.current) {
          containerRef.current.innerHTML = '<div id="qr-reader" style="width: 100%;"></div>';
        }

        const scanner = new Html5Qrcode('qr-reader');
        scannerRef.current = scanner;

        await scanner.start(
          { facingMode: 'environment' },
          { fps: 10, qrbox: { width: 280, height: 180 } },
          (decodedText) => {
            try {
              onScan(decodedText);
            } catch (e) {
              console.error('Error en onScan:', e);
            }
          },
          () => {}
        );

        setError(null);
      } catch (err) {
        setError('No se pudo acceder a la cámara. Usa el escáner físico.');
        scannerRef.current = null;
      }
    };

    startScanner();

    return () => {
      try {
        if (scannerRef.current) {
          scannerRef.current.stop().catch(() => {});
        }
      } catch (e) {
        console.error('Error en cleanup:', e);
      }
      scannerRef.current = null;
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
