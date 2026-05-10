import { useEffect, useRef } from 'react';

// Detecta input de pistola HID (scanner externo).
// Las pistolas escriben caracteres muy rápido (< 50ms entre teclas) y terminan con Enter.
export function useBarcodeScan(onScan, enabled = true) {
  const bufferRef = useRef('');
  const lastKeyRef = useRef(0);

  useEffect(() => {
    if (!enabled) return;

    function handleKeyDown(e) {
      const now = Date.now();
      const delta = now - lastKeyRef.current;
      lastKeyRef.current = now;

      if (e.key === 'Enter') {
        const code = bufferRef.current.trim();
        if (code.length > 0) {
          onScan(code);
        }
        bufferRef.current = '';
        return;
      }

      // Si el delta es muy alto, es el usuario escribiendo manualmente → resetear buffer
      if (delta > 300 && bufferRef.current.length > 0) {
        bufferRef.current = '';
      }

      if (e.key.length === 1) {
        bufferRef.current += e.key;
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onScan, enabled]);
}
