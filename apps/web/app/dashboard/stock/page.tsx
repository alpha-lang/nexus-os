'use client';

import { useState, useEffect, useMemo } from 'react';
import { usePagination } from '../../../lib/usePagination';
import { Pagination } from '../../../lib/Pagination';

const CATEGORY_META: Record<string, { label: string; color: string; bg: string }> = {
  ALIMENTAIRE: { label: 'Alimentaire', color: '#dc2626', bg: 'bg-red-50' },
  BOISSON:     { label: 'Boisson',     color: '#0891b2', bg: 'bg-cyan-50' },
  ENTRETIEN:   { label: 'Entretien',   color: '#7c3aed', bg: 'bg-purple-50' },
  LINGE:       { label: 'Linge',       color: '#d97706', bg: 'bg-amber-50' },
  AUTRE:       { label: 'Autre',       color: '#64748b', bg: 'bg-slate-50' },
};

type PresetId = 'all' | 'critical' | 'out' | 'ok';
type SortId = 'name' | 'stock-asc' | 'stock-desc' | 'value-desc';

const PRESETS = [
  { id: 'all', label: 'Tous', color: 'bg-slate-900' },
  { id: 'critical', label: 'Critiques', color: 'bg-amber-500' },
  { id: 'out', label: 'Ruptures', color: 'bg-red-500' },
  { id: 'ok', label: 'Stock OK', color: 'bg-emerald-500' },
] as const;

function getCatMeta(c: string) {
  return CATEGORY_META[c] || CATEGORY_META.AUTRE;
}

function stockStatus(item: any) {
  if (item.currentStock <= 0) return { key: 'out', label: 'RUPTURE', color: '#dc2626', bg: 'bg-red-100', text: 'text-red-700' };
  if (item.currentStock <= item.minStock) return { key: 'crit', label: 'CRITIQUE', color: '#d97706', bg: 'bg-amber-100', text: 'text-amber-700' };
  if (item.maxStock && item.currentStock > item.maxStock) return { key: 'over', label: 'SURSTOCK', color: '#7c3aed', bg: 'bg-purple-100', text: 'text-purple-700' };
  return { key: 'ok', label: 'OK', color: '#059669', bg: 'bg-emerald-100', text: 'text-emerald-700' };
}

function humanSize(n: number): string {
  return n.toLocaleString('fr-FR');
}

export default function StockPage() {
  const [items, setItems] = useState<any[]>([]);
  const [dashboard, setDashboard] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<string | null>(null);

  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<string>('ALL');
  const [preset, setPreset] = useState<PresetId>('all');
  const [sort, setSort] = useState<SortId>('stock-asc');

  const [showMovementModal, setShowMovementModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState<any>(null);

  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : '';

  async function load() {
    const [itemsRes, dashRes] = await Promise.all([
      fetch('/api/stock/items', { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()),
      fetch('/api/stock/dashboard', { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()),
    ]);
    setItems(Array.isArray(itemsRes) ? itemsRes : []);
    setDashboard(dashRes);
  }

  useEffect(() => { load().catch(console.error).finally(() => setLoading(false)); }, []);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  }

  // Filter + sort
  const filtered = useMemo(() => {
    let list = [...items];

    if (category !== 'ALL') list = list.filter(i => i.category === category);

    if (preset === 'critical') list = list.filter(i => i.currentStock > 0 && i.currentStock <= i.minStock);
    else if (preset === 'out') list = list.filter(i => i.currentStock <= 0);
    else if (preset === 'ok') list = list.filter(i => i.currentStock > i.minStock);

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(i =>
        i.name?.toLowerCase().includes(q) ||
        i.sku?.toLowerCase().includes(q) ||
        i.barcode?.toLowerCase().includes(q)
      );
    }

    list.sort((a, b) => {
      if (sort === 'name') return (a.name || '').localeCompare(b.name || '');
      if (sort === 'stock-desc') return b.currentStock - a.currentStock;
      if (sort === 'value-desc') return (b.currentStock * b.costPrice) - (a.currentStock * a.costPrice);
      // stock-asc : les plus bas en premier (utile pour réappro)
      return a.currentStock - b.currentStock;
    });

    return list;
  }, [items, category, preset, search, sort]);

  const pag = usePagination(filtered, { perPageDefault: 24 });
  useEffect(() => { pag.setPage(1); }, [search, category, preset, sort]);

  const categories = useMemo(() => {
    const set = new Set<string>();
    items.forEach(i => { if (i.category) set.add(i.category); });
    return Array.from(set).sort();
  }, [items]);

  const catCounts = useMemo(() => {
    const c: Record<string, number> = { ALL: items.length };
    categories.forEach(cat => { c[cat] = items.filter(i => i.category === cat).length; });
    return c;
  }, [items, categories]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-10 w-10 border-4 border-teal-400 border-t-transparent"></div>
      </div>
    );
  }

  const summary = dashboard?.summary || {};
  const alerts = dashboard?.alerts || { critical: [], outOfStock: [] };
  const totalAlerts = (alerts.critical?.length || 0) + (alerts.outOfStock?.length || 0);

  return (
    <div className="space-y-5">
      {toast && (
        <div className="fixed top-20 right-4 z-[100] bg-slate-900 text-white px-4 py-3 rounded-xl shadow-2xl text-sm font-medium">
          {toast}
        </div>
      )}

      {/* Bandeau alertes */}
      {totalAlerts > 0 && (() => {
        const criticalNames = [...(alerts.outOfStock || []), ...(alerts.critical || [])];
        const singleItem = criticalNames.length === 1 ? criticalNames[0] : null;
        const movementsHref = singleItem
          ? '/dashboard/stock/movements?search=' + encodeURIComponent(singleItem.name)
          : '/dashboard/stock/movements';
        return (
          <div className="bg-red-50 border-l-4 border-red-500 rounded-2xl px-5 py-4">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-full bg-red-500 text-white flex items-center justify-center font-black shrink-0">
                {totalAlerts}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-black text-red-900 text-sm uppercase tracking-wider">
                  {totalAlerts} article{totalAlerts > 1 ? 's' : ''} necessite{totalAlerts > 1 ? 'nt' : ''} votre attention
                </h3>
                {criticalNames.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {criticalNames.slice(0, 6).map((a: any) => (
                      <a
                        key={a.id}
                        href={'/dashboard/stock/movements?search=' + encodeURIComponent(a.name)}
                        className={'inline-flex items-center gap-1.5 text-[11px] font-bold px-2 py-1 rounded-md border transition hover:shadow-sm ' + (
                          (a.currentStock || 0) <= 0
                            ? 'bg-red-100 text-red-800 border-red-300 hover:bg-red-200'
                            : 'bg-amber-100 text-amber-800 border-amber-300 hover:bg-amber-200'
                        )}
                      >
                        <span className={'w-1.5 h-1.5 rounded-full ' + ((a.currentStock || 0) <= 0 ? 'bg-red-600' : 'bg-amber-600')}></span>
                        <span className="truncate max-w-[180px]">{a.name}</span>
                        {a.currentStock != null && a.minStock != null && (
                          <span className="opacity-70 font-mono text-[10px]">
                            {a.currentStock}/{a.minStock} {a.unit || ''}
                          </span>
                        )}
                      </a>
                    ))}
                    {criticalNames.length > 6 && (
                      <span className="inline-flex items-center text-[11px] font-bold px-2 py-1 text-slate-500">
                        +{criticalNames.length - 6} autres
                      </span>
                    )}
                  </div>
                )}
              </div>
              <a
                href={movementsHref}
                className="px-3 py-1.5 rounded-lg bg-red-500 text-white text-xs font-bold hover:bg-red-600 transition shrink-0 self-start"
              >
                {singleItem ? 'Voir ' + singleItem.name : 'Voir mouvements'}
              </a>
            </div>
          </div>
        );
      })()}

      {/* Header */}
      <div>
        <p className="text-xs font-black text-teal-600 uppercase tracking-widest mb-1">Inventaire</p>
        <h1 className="text-3xl font-black text-slate-900 tracking-tight">Stock</h1>
        <p className="text-slate-500 mt-1">
          Gerez vos articles, fournisseurs et mouvements de stock
        </p>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-slate-900 rounded-2xl p-5 text-white">
          <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest mb-1">Valorisation</p>
          <p className="text-2xl font-black tabular-nums text-teal-400">
            {humanSize(Math.round(summary.totalValue || 0))}
            <span className="text-sm text-slate-400 ml-1">Ar</span>
          </p>
          <p className="text-[10px] text-slate-500 mt-1">stock total</p>
        </div>
        <div className="bg-white rounded-2xl p-5 border border-slate-200">
          <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest mb-1">Articles</p>
          <p className="text-2xl font-black text-slate-900 tabular-nums">{summary.totalItems || 0}</p>
          <p className="text-[10px] text-slate-400 mt-1">references gerees</p>
        </div>
        <div className="bg-white rounded-2xl p-5 border border-slate-200">
          <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest mb-1">Magasins</p>
          <p className="text-2xl font-black text-slate-900 tabular-nums">{summary.warehouses || 0}</p>
          <p className="text-[10px] text-slate-400 mt-1">zones de stockage</p>
        </div>
        <div className="bg-white rounded-2xl p-5 border border-slate-200">
          <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest mb-1">Mouvements 30j</p>
          <p className="text-2xl font-black text-slate-900 tabular-nums">{summary.movements30d || 0}</p>
          <p className="text-[10px] text-slate-400 mt-1">
            {summary.incoming30d > 0 ? `+${humanSize(Math.round(summary.incoming30d))} Ar recus` : 'aucune entree'}
          </p>
        </div>
      </div>

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
            placeholder="Rechercher par nom, SKU, code-barres..."
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
                preset === p.id ? p.color + ' text-white shadow' : 'bg-white border border-slate-200 text-slate-600 hover:border-slate-400'
              )}
            >
              {p.label}
              {p.id === 'critical' && alerts.critical?.length > 0 && <span className="ml-1 opacity-80">{alerts.critical.length}</span>}
              {p.id === 'out' && alerts.outOfStock?.length > 0 && <span className="ml-1 opacity-80">{alerts.outOfStock.length}</span>}
            </button>
          ))}

          <select
            value={category}
            onChange={e => setCategory(e.target.value)}
            className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-700 cursor-pointer"
          >
            <option value="ALL">Toutes categories</option>
            {categories.map(c => (
              <option key={c} value={c}>{getCatMeta(c).label} ({catCounts[c] || 0})</option>
            ))}
          </select>

          <select
            value={sort}
            onChange={e => setSort(e.target.value as SortId)}
            className="ml-auto px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-700 cursor-pointer"
          >
            <option value="stock-asc">Stock croissant</option>
            <option value="stock-desc">Stock decroissant</option>
            <option value="value-desc">Valeur decroissante</option>
            <option value="name">Nom A-Z</option>
          </select>
        </div>
      </div>

      {/* Liste */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
          <p className="text-slate-600 font-semibold">Aucun article</p>
          <p className="text-xs text-slate-400 mt-1">Ajoutez vos articles ou modifiez les filtres</p>
        </div>
      ) : (
        <>
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="p-3 font-black text-slate-600 text-[10px] uppercase tracking-wider">Article</th>
                    <th className="p-3 font-black text-slate-600 text-[10px] uppercase tracking-wider hidden md:table-cell">Categorie</th>
                    <th className="p-3 font-black text-slate-600 text-[10px] uppercase tracking-wider text-right">Stock</th>
                    <th className="p-3 font-black text-slate-600 text-[10px] uppercase tracking-wider hidden lg:table-cell">Niveau</th>
                    <th className="p-3 font-black text-slate-600 text-[10px] uppercase tracking-wider text-right hidden sm:table-cell">Valeur</th>
                    <th className="p-3 font-black text-slate-600 text-[10px] uppercase tracking-wider text-center">Statut</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {pag.pageItems.map(item => {
                    const cat = getCatMeta(item.category);
                    const status = stockStatus(item);
                    const value = item.currentStock * item.costPrice;
                    const pct = item.maxStock ? Math.min(100, (item.currentStock / item.maxStock) * 100) : Math.min(100, (item.currentStock / Math.max(item.minStock * 2, 1)) * 100);
                    return (
                      <tr key={item.id} className="hover:bg-slate-50 transition">
                        <td className="p-3">
                          <div className="flex items-center gap-3">
                            <div
                              className="w-9 h-9 rounded-lg flex items-center justify-center text-white font-black text-xs shrink-0"
                              style={{ background: cat.color }}
                            >
                              {item.name?.charAt(0).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <div className="font-bold text-slate-900 text-sm truncate">{item.name}</div>
                              <div className="text-[10px] text-slate-400 font-mono truncate">
                                {item.sku || '—'} {item.supplier?.name && `· ${item.supplier.name}`}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="p-3 hidden md:table-cell">
                          <span className={'inline-flex items-center text-[10px] font-black tracking-wider px-2 py-0.5 rounded-md ' + cat.bg} style={{ color: cat.color }}>
                            {cat.label.toUpperCase()}
                          </span>
                        </td>
                        <td className="p-3 text-right whitespace-nowrap">
                          <div className="font-black text-slate-900 tabular-nums">
                            {item.currentStock} <span className="text-xs text-slate-500 font-bold">{item.unit}</span>
                          </div>
                          <div className="text-[10px] text-slate-400 tabular-nums">min {item.minStock} {item.unit}</div>
                        </td>
                        <td className="p-3 hidden lg:table-cell min-w-[120px]">
                          <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all"
                              style={{ width: `${Math.max(pct, 3)}%`, background: status.color }}
                            ></div>
                          </div>
                        </td>
                        <td className="p-3 text-right whitespace-nowrap hidden sm:table-cell">
                          <div className="font-bold text-slate-900 tabular-nums">{humanSize(Math.round(value))} <span className="text-xs text-slate-500 font-medium">Ar</span></div>
                          <div className="text-[10px] text-slate-400 tabular-nums">{humanSize(Math.round(item.costPrice))} / {item.unit}</div>
                        </td>
                        <td className="p-3 text-center">
                          <span className={'inline-flex items-center text-[9px] font-black tracking-widest px-2 py-1 rounded-md ' + status.bg + ' ' + status.text}>
                            {status.label}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
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
