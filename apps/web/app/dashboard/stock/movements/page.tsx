'use client';

import { useState, useEffect, useMemo } from 'react';
import { apiFetch } from '../../../../lib/api';
import { useSearchParams } from 'next/navigation';
import { usePagination } from '../../../../lib/usePagination';
import { Pagination } from '../../../../lib/Pagination';

type PresetId = 'today' | 'week' | 'month' | 'all';
type TypeId = 'ALL' | 'RECEPTION' | 'CONSUMPTION' | 'LOSS' | 'INVENTORY' | 'TRANSFER_IN' | 'TRANSFER_OUT';

const PRESETS = [
  { id: 'today', label: "Aujourd'hui", days: 0 },
  { id: 'week', label: '7 jours', days: 7 },
  { id: 'month', label: '30 jours', days: 30 },
  { id: 'all', label: 'Tout', days: null },
] as const;

const TYPE_META: Record<string, { label: string; color: string; bg: string; text: string; sign: string }> = {
  RECEPTION:    { label: 'Reception',    color: '#059669', bg: 'bg-emerald-50',  text: 'text-emerald-700', sign: '+' },
  CONSUMPTION:  { label: 'Consommation', color: '#dc2626', bg: 'bg-red-50',      text: 'text-red-700',     sign: '-' },
  LOSS:         { label: 'Perte',        color: '#dc2626', bg: 'bg-red-50',      text: 'text-red-700',     sign: '-' },
  INVENTORY:    { label: 'Inventaire',   color: '#7c3aed', bg: 'bg-purple-50',   text: 'text-purple-700',  sign: '±' },
  TRANSFER_IN:  { label: 'Transfert IN', color: '#0891b2', bg: 'bg-cyan-50',     text: 'text-cyan-700',    sign: '+' },
  TRANSFER_OUT: { label: 'Transfert OUT',color: '#d97706', bg: 'bg-amber-50',    text: 'text-amber-700',   sign: '-' },
};

function getTypeMeta(t: string) {
  return TYPE_META[t] || { label: t, color: '#64748b', bg: 'bg-slate-50', text: 'text-slate-600', sign: '' };
}

function dayKey(d: string | Date): string {
  const dt = new Date(d);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
}

function dayLabel(d: string | Date): string {
  const dt = new Date(d);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const dd = new Date(dt);
  dd.setHours(0, 0, 0, 0);

  if (dd.getTime() === today.getTime()) return "Aujourd'hui";
  if (dd.getTime() === yesterday.getTime()) return 'Hier';
  return dt.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}

export default function MovementsPage() {
  const [movements, setMovements] = useState<any[]>([]);
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  const searchParams = useSearchParams();
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [preset, setPreset] = useState<PresetId>('week');
  const [typeFilter, setTypeFilter] = useState<TypeId>('ALL');
  const [warehouseFilter, setWarehouseFilter] = useState<string>('ALL');

  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : '';

  async function load() {
    const [mvtRes, whRes] = await Promise.all([
      apiFetch('/api/stock/movements', { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()),
      apiFetch('/api/stock/warehouses', { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()),
    ]);
    setMovements(Array.isArray(mvtRes) ? mvtRes : []);
    setWarehouses(Array.isArray(whRes) ? whRes : []);
  }

  useEffect(() => { load().catch(console.error).finally(() => setLoading(false)); }, []);

  const filtered = useMemo(() => {
    let list = [...movements];

    if (preset !== 'all') {
      const now = Date.now();
      const days = PRESETS.find(p => p.id === preset)?.days ?? 7;
      const spanMs = preset === 'today' ? 86400000 : days * 86400000;
      const from = now - spanMs;
      list = list.filter(m => new Date(m.createdAt).getTime() >= from);
    }

    if (typeFilter !== 'ALL') {
      if (typeFilter === 'RECEPTION') list = list.filter(m => m.type === 'RECEPTION');
      else if (typeFilter === 'CONSUMPTION') list = list.filter(m => m.type === 'CONSUMPTION');
      else if (typeFilter === 'LOSS') list = list.filter(m => m.type === 'LOSS');
      else if (typeFilter === 'INVENTORY') list = list.filter(m => m.type === 'INVENTORY');
      else if (typeFilter === 'TRANSFER_IN') list = list.filter(m => m.type === 'TRANSFER_IN');
      else if (typeFilter === 'TRANSFER_OUT') list = list.filter(m => m.type === 'TRANSFER_OUT');
    }

    if (warehouseFilter !== 'ALL') {
      list = list.filter(m => m.warehouseId === warehouseFilter);
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(m =>
        m.item?.name?.toLowerCase().includes(q) ||
        m.reason?.toLowerCase().includes(q) ||
        m.reference?.toLowerCase().includes(q) ||
        m.lotNumber?.toLowerCase().includes(q) ||
        m.user?.name?.toLowerCase().includes(q)
      );
    }

    list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return list;
  }, [movements, preset, typeFilter, warehouseFilter, search]);

  // Group by day
  const grouped = useMemo(() => {
    const map = new Map<string, { label: string; items: any[]; inCount: number; outCount: number }>();
    filtered.forEach(m => {
      const key = dayKey(m.createdAt);
      if (!map.has(key)) map.set(key, { label: dayLabel(m.createdAt), items: [], inCount: 0, outCount: 0 });
      const g = map.get(key)!;
      g.items.push(m);
      if (m.quantity > 0) g.inCount += 1;
      else g.outCount += 1;
    });
    return Array.from(map.entries()).sort((a, b) => b[0].localeCompare(a[0]));
  }, [filtered]);

  const totals = useMemo(() => {
    let inQty = 0, outQty = 0;
    filtered.forEach(m => {
      if (m.quantity > 0) inQty += m.quantity;
      else outQty += Math.abs(m.quantity);
    });
    return { inQty, outQty, count: filtered.length, days: grouped.length };
  }, [filtered, grouped]);

  const pag = usePagination(grouped, { perPageDefault: 24 });
  useEffect(() => { pag.setPage(1); }, [search, preset, typeFilter, warehouseFilter]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-10 w-10 border-4 border-teal-400 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Journal</p>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Mouvements de stock</h1>
          <p className="text-slate-500 mt-1">
            Toutes les entrees et sorties, groupees par jour
          </p>
        </div>
        <a
          href="/dashboard/stock"
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-white border-2 border-slate-300 rounded-xl text-sm font-semibold text-slate-700 hover:bg-slate-900 hover:text-white hover:border-slate-900 transition shadow-sm whitespace-nowrap self-start sm:self-auto"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"/>
          </svg>
          Retour stock
        </a>
      </div>

      {/* Bandeau stats */}
      {totals.count > 0 && (
        <div className="bg-slate-900 rounded-2xl p-4 text-white">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest mb-1">Mouvements</p>
              <p className="text-2xl font-black tabular-nums">{totals.count}</p>
              <p className="text-[10px] text-slate-500 mt-0.5">{totals.days} jour{totals.days > 1 ? 's' : ''}</p>
            </div>
            <div>
              <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest mb-1">Entrees</p>
              <p className="text-2xl font-black text-emerald-400 tabular-nums">
                +{totals.inQty.toLocaleString('fr-FR')}
              </p>
              <p className="text-[10px] text-slate-500 mt-0.5">quantite totale</p>
            </div>
            <div>
              <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest mb-1">Sorties</p>
              <p className="text-2xl font-black text-red-400 tabular-nums">
                -{totals.outQty.toLocaleString('fr-FR')}
              </p>
              <p className="text-[10px] text-slate-500 mt-0.5">quantite totale</p>
            </div>
            <div>
              <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest mb-1">Net</p>
              <p className={'text-2xl font-black tabular-nums ' + (totals.inQty - totals.outQty >= 0 ? 'text-teal-400' : 'text-red-400')}>
                {totals.inQty - totals.outQty >= 0 ? '+' : ''}{(totals.inQty - totals.outQty).toLocaleString('fr-FR')}
              </p>
              <p className="text-[10px] text-slate-500 mt-0.5">delta global</p>
            </div>
          </div>
        </div>
      )}

      {/* Barre filtres */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-3 space-y-3">
        <div className="relative">
          <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
            </svg>
          </span>
          <input
            type="text"
            placeholder="Rechercher par article, reference, motif, agent..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:ring-2 focus:ring-teal-400 focus:border-teal-400 focus:bg-white transition"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-700">✕</button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {PRESETS.map(p => (
            <button
              key={p.id}
              onClick={() => setPreset(p.id as PresetId)}
              className={'px-3 py-1.5 rounded-lg text-xs font-bold transition ' + (
                preset === p.id ? 'bg-slate-900 text-white shadow' : 'bg-white border border-slate-200 text-slate-600 hover:border-slate-400'
              )}
            >
              {p.label}
            </button>
          ))}
          <span className="w-px h-5 bg-slate-200 mx-1"></span>
          <select
            value={typeFilter}
            onChange={e => setTypeFilter(e.target.value as TypeId)}
            className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-700 cursor-pointer"
          >
            <option value="ALL">Tous types</option>
            <option value="RECEPTION">Receptions</option>
            <option value="CONSUMPTION">Consommations</option>
            <option value="LOSS">Pertes</option>
            <option value="INVENTORY">Inventaires</option>
            <option value="TRANSFER_IN">Transferts IN</option>
            <option value="TRANSFER_OUT">Transferts OUT</option>
          </select>
          <select
            value={warehouseFilter}
            onChange={e => setWarehouseFilter(e.target.value)}
            className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-700 cursor-pointer"
          >
            <option value="ALL">Tous magasins</option>
            {warehouses.map(w => (
              <option key={w.id} value={w.id}>{w.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Liste groupee par jour */}
      {grouped.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
          <p className="text-slate-600 font-semibold">Aucun mouvement</p>
          <p className="text-xs text-slate-400 mt-1">Modifiez les filtres ou la periode</p>
        </div>
      ) : (
        <>
          <div className="space-y-5">
            {pag.pageItems.map(([key, group]) => {
              const isCollapsed = collapsed[key];
              return (
                <div key={key} className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                  {/* Header jour */}
                  <button
                    onClick={() => setCollapsed(prev => ({ ...prev, [key]: !prev[key] }))}
                    className="w-full flex items-center justify-between gap-4 px-5 py-3 bg-slate-50 hover:bg-slate-100 transition border-b border-slate-200"
                  >
                    <div className="flex items-center gap-3">
                      <svg
                        className={'w-4 h-4 text-slate-400 transition-transform ' + (isCollapsed ? '' : 'rotate-90')}
                        fill="none" stroke="currentColor" viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"/>
                      </svg>
                      <h2 className="font-black text-slate-900 text-sm capitalize">{group.label}</h2>
                      <span className="text-[10px] font-black text-slate-400 bg-white border border-slate-200 px-2 py-0.5 rounded-md">
                        {group.items.length} mvt{group.items.length > 1 ? 's' : ''}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-right">
                      {group.inCount > 0 && (
                        <div className="flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                          <span className="text-sm font-black text-emerald-600 tabular-nums">{group.inCount}</span>
                        </div>
                      )}
                      {group.outCount > 0 && (
                        <div className="flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-red-500"></span>
                          <span className="text-sm font-black text-red-600 tabular-nums">{group.outCount}</span>
                        </div>
                      )}
                    </div>
                  </button>

                  {/* Lignes */}
                  {!isCollapsed && (
                    <div className="divide-y divide-slate-100">
                      {group.items.map(m => {
                        const tm = getTypeMeta(m.type);
                        const isOut = m.quantity < 0;
                        return (
                          <div key={m.id} className="flex items-center gap-4 px-5 py-3 hover:bg-slate-50/60 transition group">
                            {/* Heure */}
                            <div className="w-14 shrink-0 text-center">
                              <p className="text-xs font-black text-slate-900 tabular-nums">
                                {new Date(m.createdAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                              </p>
                            </div>

                            {/* Liseré couleur */}
                            <div className="w-0.5 self-stretch rounded-full" style={{ background: tm.color }}></div>

                            {/* Article + motif */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap mb-0.5">
                                <p className="font-bold text-slate-900 text-sm truncate">{m.item?.name}</p>
                                <span className={'inline-flex items-center text-[9px] font-black tracking-wider px-1.5 py-0.5 rounded ' + tm.bg + ' ' + tm.text}>
                                  {tm.label.toUpperCase()}
                                </span>
                              </div>
                              <p className="text-[11px] text-slate-500 truncate">
                                {m.reason || 'Sans motif'}
                                {m.reference && <span className="text-slate-400 font-mono ml-2">#{m.reference.slice(-6)}</span>}
                              </p>
                              <div className="flex flex-wrap items-center gap-2 mt-0.5 text-[10px] text-slate-400">
                                {m.warehouse && (
                                  <span>Magasin : <span className="text-slate-600 font-bold">{m.warehouse.name}</span></span>
                                )}
                                {m.user && (
                                  <span>· par <span className="text-slate-600 font-bold">{m.user.name || m.user.email}</span></span>
                                )}
                              </div>
                            </div>

                            {/* Quantite */}
                            <div className="text-right shrink-0 w-28">
                              <p className={'text-lg font-black tabular-nums ' + (isOut ? 'text-red-600' : 'text-emerald-600')}>
                                {isOut ? '' : '+'}{m.quantity.toLocaleString('fr-FR')}
                                <span className="text-[10px] text-slate-400 ml-1 font-bold">{m.item?.unit}</span>
                              </p>
                              {m.unitCost != null && (
                                <p className="text-[10px] text-slate-400 tabular-nums">
                                  {(m.quantity * m.unitCost).toLocaleString('fr-FR')} Ar
                                </p>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <Pagination
            page={pag.page}
            totalPages={pag.totalPages}
            onPageChange={pag.setPage}
            perPage={pag.perPage}
            perPageOptions={pag.perPageOptions}
            onPerPageChange={pag.setPerPage}
            total={pag.total}
          />
        </>
      )}
    </div>
  );
}
