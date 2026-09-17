'use client';

import { useState, useEffect } from 'react';
import { apiFetch } from '../../../../lib/api';

export default function InventoryPage() {
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [items, setItems] = useState<any[]>([]);
  const [itemsLoading, setItemsLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [warehouseId, setWarehouseId] = useState('');
  const [counts, setCounts] = useState<Record<string, string>>({});
  const [reason, setReason] = useState('Inventaire mensuel');
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [search, setSearch] = useState('');

  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : '';

  // Charge les magasins (une seule fois)
  async function loadWarehouses() {
    const wh = await apiFetch('/api/stock/warehouses', { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json());
    const list = Array.isArray(wh) ? wh : (wh.items || []);
    setWarehouses(list);
    if (list.length > 0 && !warehouseId) setWarehouseId(list[0].id);
    return list;
  }

  // Charge les articles D'UN magasin spécifique (quantité locale)
  async function loadItemsForWarehouse(whId: string) {
    if (!whId) { setItems([]); return; }
    setItemsLoading(true);
    const res = await apiFetch(`/api/stock/warehouses/${whId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) { setItems([]); setItemsLoading(false); return; }
    const detail = await res.json();
    // On garde uniquement les articles présents dans CE magasin (quantity > 0 ou théorique non-null)
    const mapped = (detail.items || []).map((it: any) => ({
      id: it.id,
      name: it.name,
      sku: it.sku,
      unit: it.unit,
      category: it.category,
      // ⚠️ Stock théorique = stock dans CE magasin
      currentStock: it.quantity,
      minStock: it.minStock,
      maxStock: it.maxStock,
    }));
    setItems(mapped);
    setItemsLoading(false);
  }

  useEffect(() => {
    loadWarehouses()
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  // Recharger les articles quand le magasin change
  useEffect(() => {
    loadItemsForWarehouse(warehouseId).catch(console.error);
  }, [warehouseId]);

  async function submit() {
    if (!warehouseId) return;
    setSubmitting(true);
    const payload = {
      warehouseId,
      reason,
      counts: Object.entries(counts).map(([itemId, qty]) => ({ itemId, quantity: parseFloat(qty) || 0 })),
    };
    const res = await apiFetch('/api/stock/inventory/submit', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    setSubmitting(false);
    if (res.ok) {
      const data = await res.json();
      setResult(data);
      setCounts({});
      // Recharge uniquement le magasin courant
      await loadItemsForWarehouse(warehouseId);
    }
  }

  const filtered = items.filter(i => !search.trim() || i.name.toLowerCase().includes(search.toLowerCase()));

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-10 w-10 border-4 border-teal-400 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Controle physique</p>
        <h1 className="text-3xl font-black text-slate-900 tracking-tight">Inventaire</h1>
        <p className="text-slate-500 mt-1">Comparez le stock physique au stock theorique</p>
      </div>

      {/* Parametres */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 grid grid-cols-1 md:grid-cols-3 gap-3">
        <div>
          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-1.5">Magasin</label>
          <select value={warehouseId} onChange={e => setWarehouseId(e.target.value)} className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900">
            {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
          </select>
        </div>
        <div>
          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-1.5">Motif</label>
          <input type="text" value={reason} onChange={e => setReason(e.target.value)} className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900" />
        </div>
        <div>
          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-1.5">Recherche</label>
          <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Filtrer articles..." className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900" />
        </div>
      </div>

      {/* Resultat precedent */}
      {result && (
        <div className="bg-emerald-50 border border-emerald-300 rounded-2xl p-4">
          <p className="text-emerald-800 font-black text-sm">Inventaire enregistre</p>
          <p className="text-emerald-700 text-xs mt-1">{result.count} ajustement{result.count > 1 ? 's' : ''} applique{result.count > 1 ? 's' : ''}</p>
        </div>
      )}

      {/* Tableau saisie */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto max-h-[60vh] overflow-y-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 border-b border-slate-200 sticky top-0">
              <tr>
                <th className="p-3 font-black text-slate-600 text-[10px] uppercase tracking-wider">Article</th>
                <th className="p-3 font-black text-slate-600 text-[10px] uppercase tracking-wider text-right">Theorique</th>
                <th className="p-3 font-black text-slate-600 text-[10px] uppercase tracking-wider text-center">Physique</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={3} className="p-12 text-center text-slate-400">
                    {itemsLoading ? 'Chargement…' : items.length === 0
                      ? 'Aucun article dans ce magasin'
                      : 'Aucun article ne correspond au filtre'}
                  </td>
                </tr>
              )}
              {filtered.map(it => (
                <tr key={it.id} className="hover:bg-slate-50">
                  <td className="p-3">
                    <div className="font-bold text-slate-900 text-sm">{it.name}</div>
                    <div className="text-[10px] text-slate-400 font-mono">{it.sku}</div>
                  </td>
                  <td className="p-3 text-right font-bold text-slate-700 tabular-nums">
                    {it.currentStock} <span className="text-xs text-slate-400">{it.unit}</span>
                  </td>
                  <td className="p-3 text-center">
                    <input
                      type="number"
                      step="0.001"
                      value={counts[it.id] || ''}
                      onChange={e => setCounts(prev => ({ ...prev, [it.id]: e.target.value }))}
                      placeholder={String(it.currentStock)}
                      className="w-28 px-3 py-2 bg-white border-2 border-slate-300 rounded-lg text-sm font-black text-slate-900 text-center tabular-nums focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Submit */}
      <div className="flex justify-end gap-3">
        <div className="text-xs text-slate-500 self-center">
          {Object.keys(counts).length} article{Object.keys(counts).length > 1 ? 's' : ''} compte{Object.keys(counts).length > 1 ? 's' : ''}
        </div>
        <button
          onClick={submit}
          disabled={submitting || Object.keys(counts).length === 0}
          className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-black text-sm shadow-md transition disabled:opacity-50"
        >
          {submitting ? 'Enregistrement...' : 'Valider l inventaire'}
        </button>
      </div>
    </div>
  );
}
