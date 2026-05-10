import { useEffect, useRef, useState } from 'react';

export default function BarcodeScanner({ onScan, active }) {
  const containerRef = useRef(null);
  const scannerRef = useRef(null);
  const [error, setError] = useState(null);

  async function stopScanner() {
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop();
        await scannerRef.current.clear();
      } catch {
        // Ignorar errores al detener
      }
      scannerRef.current = null;
    }
  }

  useEffect(() => {
    if (!active) {
      stopScanner();
      return;
    }

    async function startScanner() {
      const { Html5Qrcode } = await import('html5-qrcode');
      if (!containerRef.current) return;

      const scanner = new Html5Qrcode('qr-reader');
      scannerRef.current = scanner;

      try {
        await scanner.start(
          { facingMode: 'environment' },
          { fps: 10, qrbox: { width: 280, height: 180 } },
          (decodedText) => onScan(decodedText),
          () => {}
        );
        setError(null);
      } catch (err) {
        setError('No se pudo acceder a la cámara. Usa el escáner físico o revisa los permisos.');
      }
    }

    startScanner();
    return () => stopScanner();
  }, [active, onScan]);

  if (!active) return null;

  return (
    <div className="rounded-xl overflow-hidden bg-black">
      <div id="qr-reader" ref={containerRef} style={{ width: '100%' }} />
      {error && (
        <p className="text-yellow-400 text-sm text-center py-3 px-4">{error}</p>
      )}
    </div>
  );
}
