'use client';

import { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { Modal, Button, FormField, Input, Select, Textarea } from '../../../../components/ui';

type StatusId = 'ALL' | 'DRAFT' | 'SENT' | 'PARTIAL' | 'RECEIVED' | 'CANCELLED';

const STATUS_META: Record<string, { label: string; color: string; bg: string; text: string }> = {
  DRAFT:     { label: 'Brouillon', color: '#64748b', bg: 'bg-slate-100',   text: 'text-slate-700' },
  SENT:      { label: 'Envoyee',   color: '#0891b2', bg: 'bg-cyan-100',    text: 'text-cyan-700' },
  PARTIAL:   { label: 'Partielle', color: '#d97706', bg: 'bg-amber-100',   text: 'text-amber-700' },
  RECEIVED:  { label: 'Recue',     color: '#059669', bg: 'bg-emerald-100', text: 'text-emerald-700' },
  CANCELLED: { label: 'Annulee',   color: '#dc2626', bg: 'bg-red-100',     text: 'text-red-700' },
};

function getStatusMeta(s: string) {
  return STATUS_META[s] || STATUS_META.DRAFT;
}

export default function OrdersPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [items, setItems] = useState<any[]>([]);
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusId>('ALL');
  const [search, setSearch] = useState('');

  const [showModal, setShowModal] = useState(false);
  const [showReceive, setShowReceive] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const searchParams = useSearchParams();
  const supplierFromUrl = searchParams.get('supplierId') || '';
  const [supplierId, setSupplierId] = useState(supplierFromUrl);
  const [expectedDate, setExpectedDate] = useState('');
  const [notes, setNotes] = useState('');
  const [lines, setLines] = useState<{ stockItemId: string; quantity: string; unitCost: string }[]>([]);

  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : '';

  async function load() {
    const [o, s, i, w] = await Promise.all([
      fetch('/api/stock/orders', { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()),
      fetch('/api/stock/suppliers', { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()),
      fetch('/api/stock/items', { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()),
      fetch('/api/stock/warehouses', { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()),
    ]);
    setOrders(Array.isArray(o) ? o : []);
    setSuppliers(Array.isArray(s) ? s : []);
    setItems(Array.isArray(i) ? i : []);
    setWarehouses(Array.isArray(w) ? w : []);
  }

  useEffect(() => { load().catch(console.error).finally(() => setLoading(false)); }, []);

  function showToast(msg: string) { setToast(msg); setTimeout(() => setToast(null), 2500); }

  function resetForm() {
    setSupplierId(''); setExpectedDate(''); setNotes('');
    setLines([{ stockItemId: '', quantity: '', unitCost: '' }]);
    setError(null);
  }

  function openCreate() { resetForm(); setShowModal(true); }

  async function loadSuggestion(sid: string) {
    if (!sid) return;
    const res = await fetch(`/api/stock/orders/suggest/${sid}`, { headers: { Authorization: `Bearer ${token}` } });
    const data = await res.json();
    if (data.items && data.items.length > 0) {
      setLines(data.items.map((i: any) => ({
        stockItemId: i.stockItemId,
        quantity: String(i.suggestQty),
        unitCost: String(i.unitCost),
      })));
      showToast(`${data.items.length} article(s) critiques pre-remplis`);
    } else {
      showToast('Aucun article critique pour ce fournisseur');
    }
  }

  function addLine() {
    setLines(prev => [...prev, { stockItemId: '', quantity: '', unitCost: '' }]);
  }
  function updateLine(idx: number, patch: any) {
    setLines(prev => prev.map((x, i) => i === idx ? { ...x, ...patch } : x));
  }
  function removeLine(idx: number) {
    setLines(prev => prev.filter((_, i) => i !== idx));
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setError(null); setSaving(true);
    const payload = {
      supplierId,
      expectedDate: expectedDate || null,
      notes,
      items: lines.filter(l => l.stockItemId && parseFloat(l.quantity) > 0),
    };
    const res = await fetch('/api/stock/orders', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    setSaving(false);
    if (res.ok) {
      const order = await res.json();
      showToast(`Commande ${order.reference} creee`);
      setShowModal(false);
      resetForm();
      await load();
    } else {
      const data = await res.json();
      setError(data.message || 'Erreur');
    }
  }

  async function sendOrder(id: string) {
    await fetch(`/api/stock/orders/${id}/send`, { method: 'PATCH', headers: { Authorization: `Bearer ${token}` } });
    showToast('Commande envoyee au fournisseur');
    await load();
  }

  async function cancelOrder(id: string) {
    if (!confirm('Annuler cette commande ?')) return;
    await fetch(`/api/stock/orders/${id}/cancel`, { method: 'PATCH', headers: { Authorization: `Bearer ${token}` } });
    showToast('Commande annulee');
    await load();
  }

  async function receiveOrder(orderId: string, warehouseId: string) {
    await fetch(`/api/stock/orders/${orderId}/receive`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ warehouseId }),
    });
    showToast('Commande receptionnee, stock mis a jour');
    setShowReceive(null);
    await load();
  }

  const filtered = useMemo(() => {
    let list = [...orders];
    if (statusFilter !== 'ALL') list = list.filter(o => o.status === statusFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(o =>
        o.reference?.toLowerCase().includes(q) ||
        o.supplier?.name?.toLowerCase().includes(q)
      );
    }
    return list;
  }, [orders, statusFilter, search]);

  const kpis = useMemo(() => {
    const total = orders.length;
    const draft = orders.filter(o => o.status === 'DRAFT').length;
    const sent = orders.filter(o => o.status === 'SENT').length;
    const totalValue = orders.filter(o => ['SENT', 'DRAFT'].includes(o.status)).reduce((s, o) => s + o.totalAmount, 0);
    return { total, draft, sent, totalValue };
  }, [orders]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-10 w-10 border-4 border-teal-400 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {toast && (
        <div className="fixed top-20 right-4 z-[100] bg-slate-900 text-white px-4 py-3 rounded-xl shadow-2xl text-sm font-medium">
          {toast}
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Approvisionnement</p>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Commandes fournisseur</h1>
          <p className="text-slate-500 mt-1">Brouillons · envoyees · receptionnees</p>
        </div>
        <Button onClick={openCreate} icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"/></svg>}>
          Nouvelle commande
        </Button>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-slate-900 rounded-2xl p-4 text-white">
          <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest mb-1">En cours</p>
          <p className="text-2xl font-black tabular-nums text-teal-400">{kpis.totalValue.toLocaleString('fr-FR')}<span className="text-sm ml-1">Ar</span></p>
          <p className="text-[10px] text-slate-500 mt-0.5">montant commandé</p>
        </div>
        <div className="bg-white rounded-2xl p-4 border border-slate-200">
          <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest mb-1">Total</p>
          <p className="text-2xl font-black text-slate-900 tabular-nums">{kpis.total}</p>
          <p className="text-[10px] text-slate-400 mt-0.5">commandes</p>
        </div>
        <div className="bg-white rounded-2xl p-4 border border-slate-200">
          <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest mb-1">Brouillons</p>
          <p className="text-2xl font-black text-slate-500 tabular-nums">{kpis.draft}</p>
          <p className="text-[10px] text-slate-400 mt-0.5">a envoyer</p>
        </div>
        <div className="bg-white rounded-2xl p-4 border border-slate-200">
          <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest mb-1">Envoyees</p>
          <p className="text-2xl font-black text-cyan-600 tabular-nums">{kpis.sent}</p>
          <p className="text-[10px] text-slate-400 mt-0.5">en attente reception</p>
        </div>
      </div>

      {/* Filtres */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-3 space-y-3">
        <div className="relative">
          <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
            </svg>
          </span>
          <input
            type="text"
            placeholder="Rechercher par reference ou fournisseur..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:ring-2 focus:ring-teal-400 focus:border-teal-400 focus:bg-white transition"
          />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {(['ALL', 'DRAFT', 'SENT', 'PARTIAL', 'RECEIVED', 'CANCELLED'] as StatusId[]).map(s => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={'px-3 py-1.5 rounded-lg text-xs font-bold transition ' + (
                statusFilter === s ? 'bg-slate-900 text-white shadow' : 'bg-white border border-slate-200 text-slate-600 hover:border-slate-400'
              )}
            >
              {s === 'ALL' ? 'Toutes' : getStatusMeta(s).label}
            </button>
          ))}
        </div>
      </div>

      {/* Liste */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
          <p className="text-slate-600 font-semibold">Aucune commande</p>
          <p className="text-xs text-slate-400 mt-1">Creez une commande pour reapprovisionner</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(o => {
            const sm = getStatusMeta(o.status);
            const isDraft = o.status === 'DRAFT';
            const isSent = o.status === 'SENT' || o.status === 'PARTIAL';
            return (
              <div key={o.id} className="bg-white rounded-2xl border border-slate-200 overflow-hidden hover:shadow-md transition">
                <a
                  href={'/dashboard/stock/orders/' + o.id}
                  className="flex items-center gap-4 p-4 hover:bg-slate-50 transition cursor-pointer"
                >
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-black shrink-0"
                    style={{ background: sm.color }}>
                    {o.supplier?.name?.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-0.5">
                      <span className="font-mono text-xs font-black text-slate-700">{o.reference}</span>
                      <span className={'text-[10px] font-black tracking-widest px-2 py-0.5 rounded ' + sm.bg + ' ' + sm.text}>
                        {sm.label.toUpperCase()}
                      </span>
                      {o.supplier?.leadTimeDays != null && (
                        <span className="text-[10px] font-bold text-slate-400">Delai {o.supplier.leadTimeDays}j</span>
                      )}
                    </div>
                    <p className="font-bold text-slate-900 text-sm truncate">{o.supplier?.name}</p>
                    <p className="text-[10px] text-slate-500">
                      {o._count?.items || 0} article{(o._count?.items || 0) > 1 ? 's' : ''}
                      {' · '}
                      {new Date(o.createdAt).toLocaleDateString('fr-FR')}
                      {o.createdBy && ` · par ${o.createdBy.name || o.createdBy.email}`}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-lg font-black text-slate-900 tabular-nums">{o.totalAmount.toLocaleString('fr-FR')} Ar</p>
                    {o.expectedDate && (
                      <p className="text-[10px] text-slate-500">Attendu {new Date(o.expectedDate).toLocaleDateString('fr-FR')}</p>
                    )}
                  </div>
                  <svg className="w-5 h-5 text-slate-300 group-hover:text-slate-500 transition shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"/>
                  </svg>
                </a>
                <div className="flex items-center gap-2 px-4 py-2.5 border-t border-slate-100 bg-slate-50/50">
                  {isDraft && (
                    <>
                      <button onClick={() => sendOrder(o.id)} className="px-3 py-1.5 rounded-lg text-xs font-black bg-cyan-500 text-white hover:bg-cyan-600 transition">
                        Envoyer au fournisseur
                      </button>
                      <button onClick={() => cancelOrder(o.id)} className="px-3 py-1.5 rounded-lg text-xs font-black text-slate-600 hover:bg-slate-100 transition">
                        Annuler
                      </button>
                    </>
                  )}
                  {isSent && (
                    <>
                      <button onClick={() => setShowReceive(o)} className="px-3 py-1.5 rounded-lg text-xs font-black bg-emerald-500 text-white hover:bg-emerald-600 transition">
                        Receptionner
                      </button>
                      <button onClick={() => cancelOrder(o.id)} className="px-3 py-1.5 rounded-lg text-xs font-black text-slate-600 hover:bg-slate-100 transition">
                        Annuler
                      </button>
                    </>
                  )}
                  {o.status === 'RECEIVED' && o.receivedAt && (
                    <span className="text-[10px] text-slate-500 font-bold">
                      Recue le {new Date(o.receivedAt).toLocaleDateString('fr-FR')}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal : Nouvelle commande */}
      <Modal
        open={showModal}
        onClose={() => { setShowModal(false); resetForm(); }}
        title="Nouvelle commande fournisseur"
        subtitle="Creez un brouillon de commande"
        icon={<span className="text-2xl font-bold">+</span>}
        size="lg"
        footer={
          <div className="flex gap-3">
            <Button variant="secondary" onClick={() => { setShowModal(false); resetForm(); }}>Annuler</Button>
            <button type="submit" form="order-form" disabled={saving} className="flex-1 bg-linear-to-r from-blue-600 to-teal-500 text-white py-2.5 rounded-xl font-semibold hover:shadow-lg transition disabled:opacity-50">
              {saving ? 'Creation...' : 'Creer le brouillon'}
            </button>
          </div>
        }
      >
        <form id="order-form" onSubmit={save} className="space-y-4">
          {error && <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">{error}</div>}

          <div className="grid grid-cols-2 gap-3">
            <FormField label="Fournisseur" required>
              <Select value={supplierId} onChange={e => setSupplierId(e.target.value)} required>
                <option value="">- Choisir -</option>
                {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </Select>
            </FormField>
            <FormField label="Date prevue">
              <Input type="date" value={expectedDate} onChange={e => setExpectedDate(e.target.value)} />
            </FormField>
          </div>

          {supplierId && (
            <button
              type="button"
              onClick={() => loadSuggestion(supplierId)}
              className="w-full py-2 bg-amber-50 border-2 border-amber-300 rounded-xl text-xs font-black text-amber-700 hover:bg-amber-100 transition"
            >
              Suggestion auto : remplir avec les articles critiques
            </button>
          )}

          <div>
            <div className="flex items-center justify-between mb-3">
              <div>
                <label className="text-sm font-bold text-slate-700">Articles a commander</label>
                <p className="text-[10px] text-slate-400 mt-0.5">{lines.length} ligne{lines.length > 1 ? 's' : ''}</p>
              </div>
              <button type="button" onClick={addLine} className="text-xs font-bold text-teal-600 hover:underline">+ Ajouter une ligne</button>
            </div>

            {/* Header colonnes */}
            <div className="grid grid-cols-12 gap-2 mb-2 px-1">
              <div className="col-span-6 text-[10px] font-black text-slate-400 uppercase tracking-wider">Article</div>
              <div className="col-span-2 text-[10px] font-black text-slate-400 uppercase tracking-wider text-center">Qte</div>
              <div className="col-span-3 text-[10px] font-black text-slate-400 uppercase tracking-wider text-right">P.U. (Ar)</div>
              <div className="col-span-1"></div>
            </div>

            <div className="space-y-2">
              {lines.map((line, idx) => {
                const selectedItem = items.find((x: any) => x.id === line.stockItemId);
                const lineTotal = (parseFloat(line.quantity) || 0) * (parseFloat(line.unitCost) || 0);
                return (
                  <div key={idx} className="bg-slate-50 rounded-xl p-2 border border-slate-200">
                    <div className="grid grid-cols-12 gap-2">
                      <div className="col-span-6 relative">
                        <select
                          value={line.stockItemId}
                          onChange={e => {
                            const it = items.find((x: any) => x.id === e.target.value);
                            updateLine(idx, { stockItemId: e.target.value, unitCost: it?.costPrice?.toString() || '' });
                          }}
                          className={'w-full px-3 py-2.5 bg-white border-2 rounded-lg text-sm font-bold transition ' + (line.stockItemId ? 'border-teal-400 text-slate-900' : 'border-slate-200 text-slate-400')}
                        >
                          <option value="">- Choisir un article -</option>
                          {items.map((i: any) => (
                            <option key={i.id} value={i.id}>{i.name} ({i.currentStock} {i.unit})</option>
                          ))}
                        </select>
                        {selectedItem && (
                          <p className="text-[10px] text-slate-500 mt-1 ml-1">
                            Stock actuel : <span className={'font-bold ' + (selectedItem.currentStock <= selectedItem.minStock ? 'text-red-600' : 'text-slate-700')}>{selectedItem.currentStock} {selectedItem.unit}</span>
                            {' · min ' + selectedItem.minStock}
                          </p>
                        )}
                      </div>
                      <input
                        type="number"
                        step="0.01"
                        value={line.quantity}
                        onChange={e => updateLine(idx, { quantity: e.target.value })}
                        placeholder="0"
                        className="col-span-2 px-2 py-2.5 bg-white border-2 border-slate-200 rounded-lg text-sm font-black text-slate-900 text-center tabular-nums focus:border-teal-400 focus:ring-2 focus:ring-teal-100 transition"
                      />
                      <input
                        type="number"
                        value={line.unitCost}
                        onChange={e => updateLine(idx, { unitCost: e.target.value })}
                        placeholder="0"
                        className="col-span-3 px-2 py-2.5 bg-white border-2 border-slate-200 rounded-lg text-sm font-black text-slate-900 text-right tabular-nums focus:border-teal-400 focus:ring-2 focus:ring-teal-100 transition"
                      />
                      <button
                        type="button"
                        onClick={() => removeLine(idx)}
                        className="col-span-1 text-red-500 hover:bg-red-100 rounded-lg font-black text-lg transition"
                        title="Retirer cette ligne"
                      >
                        ×
                      </button>
                    </div>
                    {lineTotal > 0 && (
                      <div className="flex justify-between items-center mt-2 pt-2 border-t border-slate-200">
                        <span className="text-[10px] text-slate-500 uppercase font-black tracking-wider">Sous-total ligne</span>
                        <span className="text-sm font-black text-teal-700 tabular-nums">{lineTotal.toLocaleString('fr-FR')} Ar</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Total */}
            {(() => {
              const total = lines.reduce((sum, l) => sum + (parseFloat(l.quantity) || 0) * (parseFloat(l.unitCost) || 0), 0);
              const itemCount = lines.filter(l => l.stockItemId).length;
              if (total <= 0) return null;
              return (
                <div className="mt-4 bg-slate-900 rounded-xl p-4 flex items-center justify-between">
                  <div>
                    <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest">Total commande</p>
                    <p className="text-[10px] text-slate-500 mt-0.5">{itemCount} article{itemCount > 1 ? 's' : ''}</p>
                  </div>
                  <p className="text-2xl font-black text-teal-400 tabular-nums">
                    {total.toLocaleString('fr-FR')}
                    <span className="text-sm ml-1">Ar</span>
                  </p>
                </div>
              );
            })()}
          </div>

          <FormField label="Notes">
            <Textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} />
          </FormField>
        </form>
      </Modal>

      {/* Modal : Reception */}
      {showReceive && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/80" onClick={() => setShowReceive(null)}></div>
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <h3 className="text-xl font-black text-slate-900 mb-1">Receptionner la commande</h3>
            <p className="text-sm text-slate-600 mb-4">{showReceive.reference} - {showReceive.supplier?.name}</p>

            <div className="bg-slate-50 rounded-xl p-4 mb-4">
              <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest mb-2">Montant</p>
              <p className="text-2xl font-black text-slate-900 tabular-nums">{showReceive.totalAmount.toLocaleString('fr-FR')} Ar</p>
            </div>

            <FormField label="Magasin de reception">
              <select
                id="receive-warehouse"
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900"
                defaultValue={warehouses.find((w: any) => w.isDefault)?.id || warehouses[0]?.id || ''}
              >
                {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
              </select>
            </FormField>

            <div className="flex gap-2 mt-6">
              <button onClick={() => setShowReceive(null)} className="px-5 py-3 bg-white border-2 border-slate-300 rounded-xl font-bold text-sm text-slate-900 hover:bg-slate-100 transition">
                Annuler
              </button>
              <button
                onClick={() => {
                  const el = document.getElementById('receive-warehouse') as HTMLSelectElement;
                  receiveOrder(showReceive.id, el.value);
                }}
                className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white py-3 rounded-xl font-black text-sm transition"
              >
                Confirmer la reception
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
