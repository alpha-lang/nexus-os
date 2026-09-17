'use client';

import { useState, useEffect, useMemo } from 'react';
import { apiFetch } from '../../../lib/api';
import { usePagination } from '../../../lib/usePagination';
import { Pagination } from '../../../lib/Pagination';
import { Modal, Button, FormField, Input, Select, Textarea, SearchableSelect } from '../../../components/ui';

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

  // ─── Formulaire article ───
  const [showItemModal, setShowItemModal] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [savingItem, setSavingItem] = useState(false);
  const [itemError, setItemError] = useState<string | null>(null);
  const [fName, setFName] = useState('');
  const [fSku, setFSku] = useState('');
  const [fCategory, setFCategory] = useState('ALIMENTAIRE');
  const [fUnit, setFUnit] = useState('piece');
  const [fCurrentStock, setFCurrentStock] = useState('0');
  const [fMinStock, setFMinStock] = useState('0');
  const [fMaxStock, setFMaxStock] = useState('');
  const [fCostPrice, setFCostPrice] = useState('0');
  const [fSalePrice, setFSalePrice] = useState('');
  const [fSupplierId, setFSupplierId] = useState('');
  const [fIsIngredient, setFIsIngredient] = useState(false);
  const [fIsSellable, setFIsSellable] = useState(false);
  const [fWarehouseId, setFWarehouseId] = useState('');
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [warehouses, setWarehouses] = useState<any[]>([]);

  // ─── Modal magasins ───
  const [showWarehouseModal, setShowWarehouseModal] = useState(false);
  const [editingWarehouse, setEditingWarehouse] = useState<any>(null);
  const [savingWarehouse, setSavingWarehouse] = useState(false);
  const [whError, setWhError] = useState<string | null>(null);
  const [wName, setWName] = useState('');
  const [wCode, setWCode] = useState('');
  const [wLocation, setWLocation] = useState('');
  const [wIsDefault, setWIsDefault] = useState(false);

  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : '';

  async function load() {
    const [itemsRes, dashRes] = await Promise.all([
      apiFetch('/api/stock/items', { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()),
      apiFetch('/api/stock/dashboard', { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()),
    ]);
    setItems(Array.isArray(itemsRes) ? itemsRes : []);
    setDashboard(dashRes);
  }

  useEffect(() => { load().catch(console.error).finally(() => setLoading(false)); }, []);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  }

  // ─── Charge les fournisseurs (partners SUPPLIER) ───
  async function loadSuppliers() {
    const res = await apiFetch('/api/partners?type=SUPPLIER', {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    const list = Array.isArray(data) ? data : (data.items || []);
    setSuppliers(list);
  }

  // ─── Charge les magasins ───
  async function loadWarehouses() {
    const res = await apiFetch('/api/stock/warehouses', {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    const list = Array.isArray(data) ? data : (data.items || []);
    setWarehouses(list);
    // Auto-sélectionne le magasin par défaut si rien de sélectionné
    if (!fWarehouseId && list.length > 0) {
      const def = list.find((w: any) => w.isDefault) || list[0];
      setFWarehouseId(def.id);
    }
    return list;
  }

  // ─── CRUD Magasins ───
  function openWarehouseModal(w?: any) {
    setWhError(null);
    if (w) {
      setEditingWarehouse(w);
      setWName(w.name || '');
      setWCode(w.code || '');
      setWLocation(w.location || '');
      setWIsDefault(!!w.isDefault);
    } else {
      setEditingWarehouse(null);
      setWName(''); setWCode(''); setWLocation(''); setWIsDefault(false);
    }
    setShowWarehouseModal(true);
  }

  async function saveWarehouse(e: React.FormEvent) {
    e.preventDefault();
    setWhError(null);
    setSavingWarehouse(true);
    try {
      const method = editingWarehouse ? 'PATCH' : 'POST';
      const url = editingWarehouse
        ? `/api/stock/warehouses/${editingWarehouse.id}`
        : '/api/stock/warehouses';

      const res = await apiFetch(url, {
        method,
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: wName.trim(),
          code: wCode.trim().toUpperCase(),
          location: wLocation.trim() || null,
          isDefault: wIsDefault,
        }),
      });

      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.message || 'Erreur');
      }
      showToast(editingWarehouse ? 'Magasin mis à jour' : 'Magasin créé');
      setShowWarehouseModal(false);
      setEditingWarehouse(null);
      await loadWarehouses();
      await load();
    } catch (err: any) {
      setWhError(err.message || 'Erreur');
    } finally {
      setSavingWarehouse(false);
    }
  }

  async function deleteWarehouse(id: string, name: string) {
    if (!confirm(`Supprimer le magasin "${name}" ?`)) return;
    const res = await apiFetch(`/api/stock/warehouses/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      showToast('Magasin supprimé');
      await loadWarehouses();
    } else {
      const d = await res.json();
      alert(d.message || 'Erreur');
    }
  }

  // ─── Créer un magasin par défaut si aucun ───
  async function ensureWarehouse() {
    const res = await apiFetch('/api/stock/warehouses', {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    const list = Array.isArray(data) ? data : (data.items || []);

    // Si un magasin existe déjà (peu importe lequel), on ne crée rien.
    // L'utilisateur choisira explicitement le magasin dans le picker.
    if (list.length === 0) {
      await apiFetch('/api/stock/warehouses', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Magasin principal', code: 'MAIN', isDefault: true }),
      });
      showToast('Magasin principal créé');
    }
  }

  function openItemModal(item?: any) {
    setItemError(null);
    loadSuppliers().catch(console.error);
    loadWarehouses().catch(console.error);
    if (item) {
      setEditingItem(item);
      setFName(item.name || '');
      setFSku(item.sku || '');
      setFCategory(item.category || 'ALIMENTAIRE');
      setFUnit(item.unit || 'piece');
      setFCurrentStock(String(item.currentStock ?? 0));
      setFMinStock(String(item.minStock ?? 0));
      setFMaxStock(item.maxStock != null ? String(item.maxStock) : '');
      setFCostPrice(String(item.costPrice ?? 0));
      setFSalePrice(item.salePrice != null ? String(item.salePrice) : '');
      setFSupplierId(item.supplierId || '');
      setFIsIngredient(!!item.isIngredient);
      setFIsSellable(!!item.isSellable);
      // Trouve le 1er magasin qui a du stock (via warehouseStock)
      if (item.warehouseStock && item.warehouseStock.length > 0) {
        const withStock = item.warehouseStock.find((ws: any) => ws.quantity > 0);
        if (withStock) setFWarehouseId(withStock.warehouseId);
      }
    } else {
      setEditingItem(null);
      setFName(''); setFSku(''); setFCategory('ALIMENTAIRE'); setFUnit('piece');
      setFCurrentStock('0'); setFMinStock('0'); setFMaxStock('');
      setFCostPrice('0'); setFSalePrice('');
      setFSupplierId(''); setFIsIngredient(false); setFIsSellable(false);
      // Magasin par défaut si dispo
      if (warehouses.length > 0) {
        const def = warehouses.find((w: any) => w.isDefault) || warehouses[0];
        setFWarehouseId(def.id);
      }
    }
    setShowItemModal(true);
  }

  async function saveItem(e: React.FormEvent) {
    e.preventDefault();
    setItemError(null);
    setSavingItem(true);

    try {
      if (!editingItem) await ensureWarehouse();

      const payload = {
        name: fName.trim(),
        sku: fSku.trim() || null,
        category: fCategory,
        unit: fUnit,
        currentStock: parseFloat(fCurrentStock) || 0,
        minStock: parseFloat(fMinStock) || 0,
        maxStock: fMaxStock !== '' ? parseFloat(fMaxStock) : null,
        costPrice: parseFloat(fCostPrice) || 0,
        salePrice: fSalePrice !== '' ? parseFloat(fSalePrice) : null,
        supplierId: fSupplierId || null,
        isIngredient: fIsIngredient,
        isSellable: fIsSellable,
        warehouseId: fWarehouseId || null,
      };

      const method = editingItem ? 'PATCH' : 'POST';
      const url = editingItem ? `/api/stock/items/${editingItem.id}` : '/api/stock/items';

      const res = await apiFetch(url, {
        method,
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.message || 'Erreur');
      }

      showToast(editingItem ? 'Article mis à jour' : 'Article créé');
      setShowItemModal(false);
      setEditingItem(null);
      await load();
    } catch (err: any) {
      setItemError(err.message || 'Erreur');
    } finally {
      setSavingItem(false);
    }
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
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <p className="text-xs font-black text-teal-600 uppercase tracking-widest mb-1">Inventaire</p>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Stock</h1>
          <p className="text-slate-500 mt-1">
            Gerez vos articles, fournisseurs et mouvements de stock
          </p>
        </div>
        <div className="flex gap-2 shrink-0 flex-wrap">
          <button
            onClick={() => openWarehouseModal()}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-white border-2 border-slate-300 rounded-xl text-sm font-semibold text-slate-700 hover:bg-slate-100 transition"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
            Magasins
          </button>
          <a
            href="/dashboard/stock/suppliers"
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-white border-2 border-slate-300 rounded-xl text-sm font-semibold text-slate-700 hover:bg-slate-100 transition"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1" />
            </svg>
            Fournisseurs
          </a>
          <Button
            onClick={() => openItemModal()}
            icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"/></svg>}
          >
            Ajouter un article
          </Button>
        </div>
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
                          <div className="flex items-center justify-center gap-1">
                            <span className={'inline-flex items-center text-[9px] font-black tracking-widest px-2 py-1 rounded-md ' + status.bg + ' ' + status.text}>
                              {status.label}
                            </span>
                            <button
                              onClick={() => openItemModal(item)}
                              className="w-7 h-7 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 flex items-center justify-center transition"
                              title="Modifier"
                            >
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                              </svg>
                            </button>
                          </div>
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
      {/* ═══════════ MODALE MAGASINS ═══════════ */}
      <Modal
        open={showWarehouseModal}
        onClose={() => { setShowWarehouseModal(false); setEditingWarehouse(null); }}
        title={editingWarehouse ? 'Modifier le magasin' : 'Nouveau magasin'}
        subtitle={editingWarehouse ? editingWarehouse.name : 'Créez un emplacement de stockage'}
        icon={<span className="text-2xl">🏬</span>}
        size="lg"
        footer={
          <div className="flex gap-3">
            <Button variant="secondary" onClick={() => { setShowWarehouseModal(false); setEditingWarehouse(null); }}>Fermer</Button>
          </div>
        }
      >
        <div className="space-y-5">
          {whError && <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">{whError}</div>}

          {/* Liste des magasins existants */}
          {warehouses.length > 0 && (
            <div>
              <p className="text-xs font-black text-slate-500 uppercase tracking-widest mb-2">
                Magasins actuels ({warehouses.length})
              </p>
              <div className="space-y-1.5">
                {warehouses.map((w: any) => (
                  <div key={w.id} className="flex items-center gap-3 p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                    <div className="w-8 h-8 rounded-lg bg-slate-700 text-white flex items-center justify-center text-xs font-black shrink-0">
                      {w.code.slice(0, 2)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 text-sm truncate">{w.name}</span>
                        {w.isDefault && (
                          <span className="text-[9px] font-black tracking-widest px-1.5 py-0.5 rounded bg-amber-100 text-amber-700">
                            PAR DÉFAUT
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-slate-400">
                        {w.code}{w.location ? ` · ${w.location}` : ''}
                      </p>
                    </div>
                    <button
                      onClick={() => openWarehouseModal(w)}
                      className="w-7 h-7 rounded-lg hover:bg-white text-slate-400 hover:text-blue-600 flex items-center justify-center transition"
                      title="Modifier"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                      </svg>
                    </button>
                    {!w.isDefault && (
                      <button
                        onClick={() => deleteWarehouse(w.id, w.name)}
                        className="w-7 h-7 rounded-lg hover:bg-white text-slate-400 hover:text-red-600 flex items-center justify-center transition"
                        title="Supprimer"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M1 7h22M9 7V4a2 2 0 012-2h2a2 2 0 012 2v3"/>
                        </svg>
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Form create/edit */}
          <form onSubmit={saveWarehouse} className="border-t border-slate-200 pt-5">
            <p className="text-xs font-black text-slate-500 uppercase tracking-widest mb-3">
              {editingWarehouse ? `Modifier "${editingWarehouse.name}"` : 'Nouveau magasin'}
            </p>
            <div className="grid grid-cols-2 gap-3">
              <FormField label="Nom" required>
                <Input type="text" value={wName} onChange={(e) => setWName(e.target.value)} placeholder="Cuisine" required />
              </FormField>
              <FormField label="Code" required hint="Majuscules, unique">
                <Input type="text" value={wCode} onChange={(e) => setWCode(e.target.value.toUpperCase())} placeholder="CUISINE" required />
              </FormField>
            </div>
            <div className="grid grid-cols-2 gap-3 mt-3">
              <FormField label="Emplacement">
                <Input type="text" value={wLocation} onChange={(e) => setWLocation(e.target.value)} placeholder="RDC, Sous-sol…" />
              </FormField>
              <FormField label="Par défaut">
                <label className="flex items-center gap-2 px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl cursor-pointer">
                  <input type="checkbox" checked={wIsDefault} onChange={(e) => setWIsDefault(e.target.checked)} className="w-4 h-4 rounded text-teal-600" />
                  <span className="text-sm font-medium text-slate-700">Définir par défaut</span>
                </label>
              </FormField>
            </div>
            <div className="flex justify-end mt-4">
              <button
                type="submit"
                disabled={savingWarehouse}
                className="px-5 py-2.5 bg-linear-to-r from-blue-600 to-teal-500 text-white rounded-xl font-semibold hover:shadow-lg transition disabled:opacity-50"
              >
                {savingWarehouse ? 'Enregistrement…' : editingWarehouse ? 'Enregistrer' : 'Créer le magasin'}
              </button>
            </div>
          </form>
        </div>
      </Modal>

      {/* ═══════════ MODALE ARTICLE ═══════════ */}
      <Modal
        open={showItemModal}
        onClose={() => { setShowItemModal(false); setEditingItem(null); }}
        title={editingItem ? 'Modifier l\'article' : 'Nouvel article'}
        subtitle={editingItem ? editingItem.name : 'Créer un article de stock'}
        icon={<span className="text-2xl">📦</span>}
        footer={
          <div className="flex gap-3">
            <Button variant="secondary" onClick={() => { setShowItemModal(false); setEditingItem(null); }}>Annuler</Button>
            <button
              type="submit"
              form="item-form"
              disabled={savingItem}
              className="flex-1 bg-linear-to-r from-blue-600 to-teal-500 text-white py-2.5 rounded-xl font-semibold hover:shadow-lg transition disabled:opacity-50"
            >
              {savingItem ? 'Enregistrement...' : editingItem ? 'Enregistrer' : 'Créer'}
            </button>
          </div>
        }
      >
        <form id="item-form" onSubmit={saveItem} className="space-y-5">
          {itemError && <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">{itemError}</div>}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField label="Nom de l'article" required>
              <Input type="text" value={fName} onChange={(e) => setFName(e.target.value)} placeholder="Farine T55" required />
            </FormField>
            <FormField label="SKU (référence)">
              <Input type="text" value={fSku} onChange={(e) => setFSku(e.target.value)} placeholder="FAR-T55" />
            </FormField>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <FormField label="Catégorie">
              <Select value={fCategory} onChange={(e) => setFCategory(e.target.value)}>
                <option value="ALIMENTAIRE">Alimentaire</option>
                <option value="BOISSON">Boisson</option>
                <option value="ENTRETIEN">Entretien</option>
                <option value="LINGE">Linge</option>
                <option value="AUTRE">Autre</option>
              </Select>
            </FormField>
            <FormField label="Unité">
              <Select value={fUnit} onChange={(e) => setFUnit(e.target.value)}>
                <option value="piece">Pièce</option>
                <option value="kg">Kilogramme</option>
                <option value="g">Gramme</option>
                <option value="L">Litre</option>
                <option value="cl">Centilitre</option>
                <option value="m">Mètre</option>
              </Select>
            </FormField>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <FormField label="Stock actuel">
              <Input type="number" step="0.01" value={fCurrentStock} onChange={(e) => setFCurrentStock(e.target.value)} />
            </FormField>
            <FormField label="Stock min">
              <Input type="number" step="0.01" value={fMinStock} onChange={(e) => setFMinStock(e.target.value)} />
            </FormField>
            <FormField label="Stock max">
              <Input type="number" step="0.01" value={fMaxStock} onChange={(e) => setFMaxStock(e.target.value)} placeholder="Optionnel" />
            </FormField>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <FormField label="Prix d'achat (Ar)">
              <Input type="number" step="0.01" value={fCostPrice} onChange={(e) => setFCostPrice(e.target.value)} />
            </FormField>
            <FormField label="Prix de vente (Ar)">
              <Input type="number" step="0.01" value={fSalePrice} onChange={(e) => setFSalePrice(e.target.value)} placeholder="Optionnel" />
            </FormField>
          </div>

          <FormField label="Magasin de stockage" required hint="Où le stock initial est rangé">
            {warehouses.length === 0 ? (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-800">
                Aucun magasin. Un magasin <strong>par défaut</strong> sera créé automatiquement.
              </div>
            ) : (
              <Select value={fWarehouseId} onChange={(e) => setFWarehouseId(e.target.value)}>
                {warehouses.map((w: any) => (
                  <option key={w.id} value={w.id}>
                    {w.name} {w.isDefault ? '(par défaut)' : ''} — {w.code}
                  </option>
                ))}
              </Select>
            )}
          </FormField>

          <FormField label="Fournisseur (optionnel)">
            <SearchableSelect
              value={fSupplierId}
              onChange={setFSupplierId}
              options={suppliers.map((s: any) => ({
                value: s.id,
                label: s.name,
                sub: [s.contactName, s.phone, s.city].filter(Boolean).join(' · '),
              }))}
              placeholder="Rechercher un fournisseur…"
              emptyLabel="— Aucun fournisseur —"
            />
          </FormField>

          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={fIsIngredient} onChange={(e) => setFIsIngredient(e.target.checked)} className="w-4 h-4 rounded text-teal-600" />
              <span className="text-sm font-medium text-slate-700">Utilisé en cuisine (ingrédient)</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={fIsSellable} onChange={(e) => setFIsSellable(e.target.checked)} className="w-4 h-4 rounded text-teal-600" />
              <span className="text-sm font-medium text-slate-700">Revendable directement</span>
            </label>
          </div>
        </form>
      </Modal>
    </div>
  );
}
