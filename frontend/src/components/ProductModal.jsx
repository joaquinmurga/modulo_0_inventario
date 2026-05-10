import { useState, useRef, useEffect } from 'react';
import { api } from '../services/api';

const CATEGORIES = ['Lácteos', 'Bebidas', 'Limpieza', 'Snacks', 'Electrónica', 'Ropa', 'Otro'];

function CameraCapture({ onCapture, onClose }) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function startCamera() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
        });
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.onloadedmetadata = () => setReady(true);
        }
      } catch {
        setError('No se pudo acceder a la cámara. Verificá los permisos del navegador.');
      }
    }
    startCamera();
    return () => streamRef.current?.getTracks().forEach((t) => t.stop());
  }, []);

  function capturePhoto() {
    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d').drawImage(video, 0, 0);
    const base64 = canvas.toDataURL('image/jpeg', 0.85).split(',')[1];
    streamRef.current?.getTracks().forEach((t) => t.stop());
    onCapture(base64, 'image/jpeg');
  }

  return (
    <div className="fixed inset-0 bg-black/80 flex flex-col items-center justify-center z-[60] p-4">
      <div className="bg-black rounded-2xl overflow-hidden w-full max-w-md">
        {error ? (
          <div className="p-6 text-center text-yellow-400 text-sm">{error}</div>
        ) : (
          <video ref={videoRef} autoPlay playsInline muted className="w-full" />
        )}
        <div className="flex gap-3 p-4 bg-gray-900">
          <button
            onClick={onClose}
            className="flex-1 border border-gray-600 text-gray-300 rounded-xl py-3 text-sm font-medium hover:bg-gray-800"
          >
            Cancelar
          </button>
          <button
            onClick={capturePhoto}
            disabled={!ready || !!error}
            className="flex-grow bg-white text-gray-900 rounded-xl py-3 text-sm font-bold hover:bg-gray-100 disabled:opacity-40"
          >
            Capturar foto
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ProductModal({ barcode, onConfirm, onCancel }) {
  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [price, setPrice] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [aiError, setAiError] = useState(null);
  const [extraCategory, setExtraCategory] = useState(null);
  const fileInputRef = useRef(null);

  const allCategories = extraCategory && !CATEGORIES.includes(extraCategory)
    ? [...CATEGORIES, extraCategory]
    : CATEGORIES;

  async function handleCapture(base64, mimeType) {
    setShowCamera(false);
    setAnalyzing(true);
    setAiError(null);

    try {
      const { data } = await api.analyzeImage(base64, mimeType, barcode);

      const nameParts = [data.brand, data.model, data.name].filter(Boolean);
      const composedName = nameParts.join(' - ').substring(0, 80);
      if (composedName) setName(composedName);

      if (data.category) {
        const matched = CATEGORIES.find(
          (c) =>
            c.toLowerCase().includes(data.category.toLowerCase()) ||
            data.category.toLowerCase().includes(c.toLowerCase())
        );
        if (matched) {
          setCategory(matched);
        } else {
          setExtraCategory(data.category);
          setCategory(data.category);
        }
      }

      const descParts = [];
      if (data.capacity) descParts.push(`Cap: ${data.capacity}`);
      if (data.description) descParts.push(data.description);
      if (descParts.length) setDescription(descParts.join(', '));
    } catch (err) {
      setAiError(err.message || 'Error desconocido al analizar la imagen.');
    } finally {
      setAnalyzing(false);
    }
  }

  function handleFileSelect(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => handleCapture(reader.result.split(',')[1], file.type);
    reader.readAsDataURL(file);
    e.target.value = '';
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);
    await onConfirm({
      barcode,
      name: name.trim(),
      category,
      price: parseFloat(price) || 0,
      description: description.trim(),
    });
    setLoading(false);
  }

  return (
    <>
      {showCamera && (
        <CameraCapture onCapture={handleCapture} onClose={() => setShowCamera(false)} />
      )}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileSelect}
      />

      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
          <h2 className="text-lg font-bold text-gray-800 mb-1">Producto no encontrado</h2>
          <p className="text-sm text-gray-500 mb-4">
            Código: <code className="bg-gray-100 px-1.5 py-0.5 rounded text-indigo-700">{barcode}</code>
          </p>

          {/* Botones IA */}
          <div className="mb-4">
            <p className="text-xs font-medium text-gray-500 uppercase mb-2">Analizar con IA</p>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setShowCamera(true)}
                disabled={analyzing}
                className="flex flex-col items-center gap-1.5 border-2 border-dashed border-indigo-300 text-indigo-600 rounded-xl py-3 text-xs font-medium hover:bg-indigo-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                Tomar foto
              </button>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={analyzing}
                className="flex flex-col items-center gap-1.5 border-2 border-dashed border-indigo-300 text-indigo-600 rounded-xl py-3 text-xs font-medium hover:bg-indigo-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                Seleccionar imagen
              </button>
            </div>

            {analyzing && (
              <div className="mt-2 flex items-center gap-2 text-indigo-600 text-xs font-medium">
                <svg className="animate-spin h-3.5 w-3.5" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                </svg>
                Analizando producto...
              </div>
            )}
            {aiError && <p className="mt-2 text-xs text-red-600">{aiError}</p>}
          </div>

          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nombre *</label>
              <input
                autoFocus
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ej. Leche Entera 1L"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Categoría</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
              >
                <option value="">Sin categoría</option>
                {allCategories.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Marca, modelo, capacidad..."
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Precio</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="0.00"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={onCancel}
                className="flex-1 border border-gray-300 text-gray-700 rounded-lg py-2 text-sm font-medium hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={loading || analyzing}
                className="flex-1 bg-indigo-600 text-white rounded-lg py-2 text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
              >
                {loading ? 'Guardando...' : 'Guardar y registrar'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}
