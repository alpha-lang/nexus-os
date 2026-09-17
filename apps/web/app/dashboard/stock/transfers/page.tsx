'use client';

import { useState, useEffect, useMemo } from 'react';
import { apiFetch, unwrap } from '../../../../lib/api';
import { Modal, Button, FormField, Input, Select, SearchableSelect } from '../../../../components/ui';

export default function TransfersPage() {
  const [history, setHistory] = useState<any[]>([]);
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [allItems, setAllItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  // Form
  const [fromWh, setFromWh] = useState('');
  const [toWh, setToWh] = useState('');
  const [itemId, setItemId] = useState('');
  const [quantity, setQuantity] = useState('');
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Items disponibles dans le magasin source
  const [sourceItems, setSourceItems] = useState<any[]>([]);
  const [loadingItems, setLoadingItems] = useState(false);

  const [toast, setToast] = useState<string | null>(null);

  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : '';
  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  async function loadAll() {
    const [whRes, histRes, itemsRes] = await Promise.all([
      apiFetch('/api/stock/warehouses', { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()),
      apiFetch('/api/stock/transfers/history', { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()),
      apiFetch('/api/stock/items', { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()),
    ]);
    setWarehouses(unwrap(whRes));
    setHistory(unwrap(histRes));
    setAllItems(unwrap(itemsRes));
  }

  useEffect(() => {
    loadAll().catch(console.error).finally(() => setLoading(false));
  }, []);

  // Charge les articles du magasin source (avec leur quantité)
  useEffect(() => {
    if (!fromWh) { setSourceItems([]); return; }
    setLoadingItems(true);
    apiFetch(`/api/stock/warehouses/${fromWh}`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then((detail) => {
        const items = (detail.items || [])
          .filter((i: any) => i.quantity > 0)
          .map((i: any) => ({
            id: i.id,
            name: i.name,
            sku: i.sku,
            unit: i.unit,
            quantity: i.quantity,
          }));
        setSourceItems(items);
      })
      .catch(console.error)
      .finally(() => setLoadingItems(false));
  }, [fromWh, token]);

  function showToast(msg: string) { setToast(msg); setTimeout(() => setToast(null), 2500); }

  function openModal() {
    setFromWh('');
    setToWh('');
    setItemId('');
    setQuantity('');
    setReason('');
    setError(null);
    setShowModal(true);
  }

  const selectedItem = sourceItems.find((i) => i.id === itemId);
  const availableQty = selectedItem?.quantity || 0;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (fromWh === toWh) { setError('Les magasins source et destination doivent être différents'); return; }
    if (!itemId) { setError('Sélectionnez un article'); return; }

    const qty = parseFloat(quantity);
    if (!qty || qty <= 0) { setError('Quantité invalide'); return; }
    if (qty > availableQty) { setError(`Stock insuffisant (${availableQty} disponible)`); return; }

    setSaving(true);
    try {
      const res = await apiFetch('/api/stock/transfers', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          fromWarehouseId: fromWh,
          toWarehouseId: toWh,
          itemId,
          quantity: qty,
          reason: reason.trim() || 'Transfert',
        }),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.message || 'Erreur');
      }
      showToast('Transfert effectué');
      setShowModal(false);
      await loadAll();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  const stats = useMemo(() => {
    const last30d = Date.now() - 30 * 86400000;
    const recent = history.filter((h) => new Date(h.date).getTime() >= last30d);
    const totalQty = recent.reduce((s, h) => s + h.quantity, 0);
    return { total: history.length, last30d: recent.length, totalQty: Math.round(totalQty * 100) / 100 };
  }, [history]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-10 w-10 border-4 border-teal-400 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="space-y-5 max-w-7xl">
      {toast && (
        <div className="fixed top-20 right-4 z-[100] bg-slate-900 text-white px-4 py-3 rounded-xl shadow-2xl text-sm font-medium">
          {toast}
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <p className="text-xs font-black text-teal-600 uppercase tracking-widest mb-1">Logistique interne</p>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Transferts</h1>
          <p className="text-slate-500 mt-1">
            Déplacez du stock entre vos magasins
          </p>
        </div>
        <div className="flex gap-2">
          <a
            href="/dashboard/stock/warehouses"
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-white border-2 border-slate-300 rounded-xl text-sm font-semibold text-slate-700 hover:bg-slate-100 transition"
          >
            Magasins
          </a>
          <Button
            onClick={openModal}
            icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"/></svg>}
          >
            Nouveau transfert
          </Button>
        </div>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        <div className="bg-slate-900 rounded-2xl p-5 text-white">
          <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest mb-1">Total transferts</p>
          <p className="text-2xl font-black tabular-nums text-teal-400">{stats.total}</p>
          <p className="text-[10px] text-slate-500 mt-0.5">historique complet</p>
        </div>
        <div className="bg-white rounded-2xl p-5 border border-slate-200">
          <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest mb-1">30 derniers jours</p>
          <p className="text-2xl font-black text-slate-900 tabular-nums">{stats.last30d}</p>
          <p className="text-[10px] text-slate-400 mt-0.5">transferts effectués</p>
        </div>
        <div className="bg-white rounded-2xl p-5 border border-slate-200">
          <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest mb-1">Quantité 30j</p>
          <p className="text-2xl font-black text-slate-900 tabular-nums">{stats.totalQty}</p>
          <p className="text-[10px] text-slate-400 mt-0.5">unités déplacées</p>
        </div>
      </div>

      {/* Liste historique */}
      {history.length === 0 ? (
        <div className="bg-white rounded-2xl border-2 border-dashed border-slate-200 p-16 text-center">
          <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center text-3xl mx-auto mb-3">↔️</div>
          <p className="text-lg font-bold text-slate-700 mb-1">Aucun transfert</p>
          <p className="text-sm text-slate-400">Déplacez du stock d'un magasin à un autre</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="p-3 text-[10px] font-black text-slate-500 uppercase tracking-wider">Date</th>
                  <th className="p-3 text-[10px] font-black text-slate-500 uppercase tracking-wider">Article</th>
                  <th className="p-3 text-[10px] font-black text-slate-500 uppercase tracking-wider text-center">De</th>
                  <th className="p-3 text-[10px] font-black text-slate-500 uppercase tracking-wider text-center">→</th>
                  <th className="p-3 text-[10px] font-black text-slate-500 uppercase tracking-wider text-center">Vers</th>
                  <th className="p-3 text-[10px] font-black text-slate-500 uppercase tracking-wider text-right">Qté</th>
                  <th className="p-3 text-[10px] font-black text-slate-500 uppercase tracking-wider hidden lg:table-cell">Par</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {history.map((h) => (
                  <tr key={h.id} className="hover:bg-slate-50">
                    <td className="p-3 text-xs text-slate-600 whitespace-nowrap">
                      <div>{new Date(h.date).toLocaleDateString('fr-FR')}</div>
                      <div className="text-slate-400">
                        {new Date(h.date).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </td>
                    <td className="p-3">
                      <p className="font-bold text-slate-900 text-sm">{h.item?.name}</p>
                      <p className="text-[10px] text-slate-400 font-mono">{h.item?.sku || '—'}</p>
                    </td>
                    <td className="p-3 text-center">
                      <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg bg-red-50 text-red-700 text-xs font-bold">
                        <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span>
                        {h.fromWarehouse?.name || '—'}
                      </span>
                    </td>
                    <td className="p-3 text-center text-slate-400 font-black">→</td>
                    <td className="p-3 text-center">
                      <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg bg-emerald-50 text-emerald-700 text-xs font-bold">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                        {h.toWarehouse?.name || '—'}
                      </span>
                    </td>
                    <td className="p-3 text-right">
                      <span className="font-black text-slate-900 tabular-nums">{h.quantity}</span>
                      <span className="text-[10px] text-slate-400 ml-1">{h.item?.unit}</span>
                    </td>
                    <td className="p-3 hidden lg:table-cell text-xs text-slate-600">
                      {h.user?.name || h.user?.email || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modale nouveau transfert */}
      <Modal
        open={showModal}
        onClose={() => setShowModal(false)}
        title="Nouveau transfert"
        subtitle="Déplacer du stock entre magasins"
        icon={<span className="text-2xl">↔️</span>}
        size="lg"
        footer={
          <div className="flex gap-3">
            <Button variant="secondary" onClick={() => setShowModal(false)}>Annuler</Button>
            <button
              type="submit"
              form="transfer-form"
              disabled={saving}
              className="flex-1 bg-linear-to-r from-blue-600 to-teal-500 text-white py-2.5 rounded-xl font-semibold hover:shadow-lg transition disabled:opacity-50"
            >
              {saving ? 'Transfert...' : 'Valider le transfert'}
            </button>
          </div>
        }
      >
        <form id="transfer-form" onSubmit={submit} className="space-y-5">
          {error && <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">{error}</div>}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField label="Magasin source" required>
              <Select value={fromWh} onChange={(e) => { setFromWh(e.target.value); setItemId(''); }} required>
                <option value="">— Choisir —</option>
                {warehouses.map((w: any) => (
                  <option key={w.id} value={w.id}>{w.name}</option>
                ))}
              </Select>
            </FormField>

            <FormField label="Magasin destination" required hint="Doit être différent du source">
              <Select value={toWh} onChange={(e) => setToWh(e.target.value)} required>
                <option value="">— Choisir —</option>
                {warehouses.filter((w: any) => w.id !== fromWh).map((w: any) => (
                  <option key={w.id} value={w.id}>{w.name}</option>
                ))}
              </Select>
            </FormField>
          </div>

          <FormField label="Article" required hint={fromWh ? 'Articles disponibles dans le magasin source' : 'Choisissez d\'abord le magasin source'}>
            {!fromWh ? (
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-400 italic">
                Sélectionnez un magasin source ci-dessus
              </div>
            ) : loadingItems ? (
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-500">
                Chargement des articles…
              </div>
            ) : sourceItems.length === 0 ? (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-800">
                Aucun article dans ce magasin
              </div>
            ) : (
              <SearchableSelect
                value={itemId}
                onChange={setItemId}
                options={sourceItems.map((i: any) => ({
                  value: i.id,
                  label: i.name,
                  sub: `${i.quantity} ${i.unit} disponible${i.sku ? ' · ' + i.sku : ''}`,
                }))}
                placeholder="Rechercher un article…"
                emptyLabel="— Choisir un article —"
              />
            )}
          </FormField>

          {selectedItem && (
            <div className="bg-teal-50 border border-teal-200 rounded-xl p-3 flex items-center justify-between">
              <div>
                <p className="text-[10px] text-teal-700 uppercase font-black tracking-widest">Disponible</p>
                <p className="text-lg font-black text-teal-900">
                  {availableQty} <span className="text-xs">{selectedItem.unit}</span>
                </p>
              </div>
              <div className="text-right">
                <p className="text-[10px] text-teal-700 uppercase font-black tracking-widest">SKU</p>
                <p className="text-sm font-mono text-teal-900">{selectedItem.sku || '—'}</p>
              </div>
            </div>
          )}

          <FormField label="Quantité à transférer" required>
            <Input
              type="number"
              step="0.01"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              placeholder={selectedItem ? `Max ${availableQty}` : '0'}
              max={availableQty}
              required
            />
          </FormField>

          <FormField label="Motif (optionnel)">
            <Input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Réassort cuisine, transfert mensuel…"
            />
          </FormField>
        </form>
      </Modal>
    </div>
  );
}
