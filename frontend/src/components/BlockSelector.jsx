import { useState } from 'react';

export default function BlockSelector({ value, onChange }) {
  const [custom, setCustom] = useState('');

  const presets = ['Góndola 1', 'Góndola 2', 'Vitrina A', 'Vitrina B', 'Depósito'];

  return (
    <div className="bg-white rounded-xl shadow p-4 mb-6">
      <h2 className="text-sm font-semibold text-gray-500 uppercase mb-3">Bloque de escaneo activo</h2>

      <div className="flex flex-wrap gap-2 mb-3">
        {presets.map((p) => (
          <button
            key={p}
            onClick={() => onChange(p)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
              value === p
                ? 'bg-indigo-600 text-white border-indigo-600'
                : 'bg-white text-gray-700 border-gray-300 hover:border-indigo-400'
            }`}
          >
            {p}
          </button>
        ))}
      </div>

      <div className="flex gap-2">
        <input
          type="text"
          placeholder="Otro bloque..."
          value={custom}
          onChange={(e) => setCustom(e.target.value)}
          className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
        />
        <button
          onClick={() => { if (custom.trim()) { onChange(custom.trim()); setCustom(''); } }}
          className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700"
        >
          Usar
        </button>
      </div>

      {value && (
        <p className="mt-2 text-xs text-indigo-700 font-medium">
          ✓ Escaneando en: <span className="font-bold">{value}</span>
        </p>
      )}
    </div>
  );
}
