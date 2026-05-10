import { useState } from 'react';

export default function AdjustQtyModal({ product, blocks, onSave, onClose }) {
  const [action, setAction] = useState('add');
  const [quantity, setQuantity] = useState(1);
  const [block, setBlock] = useState(blocks[0] || '');
  const [customBlock, setCustomBlock] = useState('');
  const [loading, setLoading] = useState(false);

  const effectiveBlock = block === '__custom__' ? customBlock.trim() : block;

  async function handleSubmit(e) {
    e.preventDefault();
    if (!effectiveBlock || quantity < 1) return;
    const finalQty = action === 'add' ? Number(quantity) : -Number(quantity);
    setLoading(true);
    await onSave(product.product_id, effectiveBlock, finalQty);
    setLoading(false);
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
        <h2 className="text-lg font-bold text-gray-800 mb-1">Ajustar cantidad</h2>
        <p className="text-sm text-gray-500 mb-4">{product.name}</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Agregar / Retirar toggle */}
          <div className="flex rounded-lg border border-gray-300 overflow-hidden">
            <button
              type="button"
              onClick={() => setAction('add')}
              className={`flex-1 py-2 text-sm font-medium transition-colors ${
                action === 'add'
                  ? 'bg-green-600 text-white'
                  : 'bg-white text-gray-600 hover:bg-gray-50'
              }`}
            >
              Agregar
            </button>
            <button
              type="button"
              onClick={() => setAction('remove')}
              className={`flex-1 py-2 text-sm font-medium transition-colors ${
                action === 'remove'
                  ? 'bg-red-600 text-white'
                  : 'bg-white text-gray-600 hover:bg-gray-50'
              }`}
            >
              Retirar
            </button>
          </div>

          {/* Cantidad */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Cantidad</label>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setQuantity((q) => Math.max(1, Number(q) - 1))}
                className="w-9 h-9 rounded-lg border border-gray-300 text-gray-700 font-bold hover:bg-gray-50 flex items-center justify-center"
              >
                -
              </button>
              <input
                type="number"
                min="1"
                value={quantity}
                onChange={(e) => setQuantity(Math.max(1, Number(e.target.value)))}
                className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm text-center focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
              <button
                type="button"
                onClick={() => setQuantity((q) => Number(q) + 1)}
                className="w-9 h-9 rounded-lg border border-gray-300 text-gray-700 font-bold hover:bg-gray-50 flex items-center justify-center"
              >
                +
              </button>
            </div>
          </div>

          {/* Bloque */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Bloque</label>
            <select
              value={block}
              onChange={(e) => setBlock(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
            >
              {blocks.map((b) => <option key={b} value={b}>{b}</option>)}
              <option value="__custom__">Otro bloque...</option>
            </select>
            {block === '__custom__' && (
              <input
                type="text"
                value={customBlock}
                onChange={(e) => setCustomBlock(e.target.value)}
                placeholder="Nombre del bloque"
                className="mt-2 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
            )}
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 border border-gray-300 text-gray-700 rounded-lg py-2 text-sm font-medium hover:bg-gray-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading || !effectiveBlock}
              className={`flex-1 text-white rounded-lg py-2 text-sm font-medium disabled:opacity-50 ${
                action === 'add' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'
              }`}
            >
              {loading ? 'Guardando...' : action === 'add' ? 'Agregar' : 'Retirar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
