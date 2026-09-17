'use client';

import { useState, useEffect, useMemo } from 'react';
import { apiFetch, unwrap } from '../../../lib/api';
import ConfirmDialog from '../../../components/ConfirmDialog';
import { Modal, Button, FormField, Input, Select, Textarea } from '../../../components/ui';

const AVAILABLE_TYPES = ['COMMERCE', 'HOTEL', 'ONG', 'MICROFINANCE', 'BANQUE'];

function slugify(s: string) {
  return s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function priceTier(price: number) {
  if (price === 0) return { label: 'GRATUIT', color: '#059669', bg: 'bg-emerald-50', border: 'border-emerald-300' };
  if (price < 20000) return { label: 'ECO', color: '#0891b2', bg: 'bg-cyan-50', border: 'border-cyan-300' };
  if (price < 40000) return { label: 'STANDARD', color: '#d97706', bg: 'bg-amber-50', border: 'border-amber-300' };
  return { label: 'PREMIUM', color: '#dc2626', bg: 'bg-red-50', border: 'border-red-300' };
}

type ViewMode = 'grid' | 'table';
type StatusFilter = 'ALL' | 'ACTIVE' | 'INACTIVE';

export default function ModulesPage() {
  const [modules, setModules] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterTarget, setFilterTarget] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');
  const [sort, setSort] = useState<'price-desc' | 'price-asc' | 'name'>('price-desc');
  const [view, setView] = useState<ViewMode>('grid');
  const [perPage, setPerPage] = useState(24);
  const [page, setPage] = useState(1);

  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [moduleToDelete, setModuleToDelete] = useState<any>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [openMenu, setOpenMenu] = useState<string | null>(null);

  const [name, setName] = useState('');
  const [types, setTypes] = useState<string[]>([]);
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [pricing, setPricing] = useState<Record<string, string>>({});
  const [status, setStatus] = useState('ACTIVE');
  const [route, setRoute] = useState('');
  const [routeManuallyEdited, setRouteManuallyEdited] = useState(false);

  const isOwner = typeof window !== 'undefined' && localStorage.getItem('isOwner') === 'true';
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : '';

  useEffect(() => {
    if (!routeManuallyEdited && name.trim()) {
      setRoute('/dashboard/' + slugify(name));
    }
  }, [name, routeManuallyEdited]);

  useEffect(() => {
    // Auto-switch en table si > 24 modules
    if (modules.length > 24 && view === 'grid') setView('table');
  }, [modules.length]);

  async function load() {
    const res = await apiFetch('/api/modules', { headers: { Authorization: 'Bearer ' + token } });
    const data = await res.json();
    setModules(unwrap(data));
  }

  useEffect(() => {
    load().catch(console.error).finally(() => setLoading(false));
    const closeMenu = () => setOpenMenu(null);
    document.addEventListener('click', closeMenu);
    return () => document.removeEventListener('click', closeMenu);
  }, []);

  useEffect(() => { setPage(1); }, [search, filterTarget, statusFilter, sort, perPage, view]);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  }

  function resetForm() {
    setName(''); setTypes([]); setDescription(''); setPrice('');
    setPricing({});
    setStatus('ACTIVE'); setRoute(''); setRouteManuallyEdited(false);
    setError(null); setEditing(null);
  }

  function openCreate() { resetForm(); setShowModal(true); }

  function openEdit(m: any) {
    setEditing(m);
    setName(m.name);
    setTypes(m.types ? m.types.split(',') : []);
    setDescription(m.description || '');
    setPrice(m.price?.toString() || '');
    if (m.pricing && typeof m.pricing === 'object') {
      const p: Record<string, string> = {};
      Object.entries(m.pricing).forEach(([k, v]) => { p[k] = String(v); });
      setPricing(p);
    } else setPricing({});
    setStatus(m.status || 'ACTIVE');
    setRoute(m.route || '');
    setRouteManuallyEdited(true);
    setError(null);
    setShowModal(true);
  }

  function toggleType(t: string) {
    setTypes(prev => {
      const next = prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t];
      setPricing(p => {
        const out = { ...p };
        if (!next.includes(t)) delete out[t];
        return out;
      });
      return next;
    });
  }

  function setPricingField(type: string, value: string) {
    setPricing(p => ({ ...p, [type]: value }));
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setError(null); setSaving(true);
    const method = editing ? 'PATCH' : 'POST';
    const url = editing ? '/api/modules/' + editing.id : '/api/modules';
    const res = await apiFetch(url, {
      method,
      headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name, types, description,
        price: parseFloat(price) || 0,
        pricing: Object.keys(pricing).length > 0
          ? Object.fromEntries(Object.entries(pricing).filter(([, v]) => v !== '').map(([k, v]) => [k, parseFloat(v) || 0]))
          : null,
        status, route,
      }),
    });
    setSaving(false);
    if (res.ok) {
      showToast(editing ? 'Module mis a jour' : 'Module cree');
      setShowModal(false);
      resetForm();
      await load();
    } else {
      const data = await res.json();
      setError(data.message || 'Erreur');
    }
  }

  async function confirmDelete() {
    if (!moduleToDelete) return;
    setIsDeleting(true);
    await apiFetch('/api/modules/' + moduleToDelete.id, {
      method: 'DELETE',
      headers: { Authorization: 'Bearer ' + token },
    });
    setModuleToDelete(null);
    setIsDeleting(false);
    showToast('Module supprime');
    await load();
  }

  const kpis = useMemo(() => {
    const total = modules.length;
    const active = modules.filter(m => m.status === 'ACTIVE').length;
    const paid = modules.filter(m => m.price > 0).length;
    const totalValue = modules.reduce((s, m) => s + (m.price || 0), 0);
    const avgPrice = paid > 0 ? totalValue / paid : 0;
    return { total, active, paid, totalValue, avgPrice };
  }, [modules]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { ALL: modules.length, UNIVERSEL: 0 };
    AVAILABLE_TYPES.forEach(t => { c[t] = 0; });
    modules.forEach(m => {
      if (!m.types || m.types === '') { c.UNIVERSEL++; return; }
      m.types.split(',').forEach((t: string) => { if (c[t] !== undefined) c[t]++; });
    });
    return c;
  }, [modules]);

  const filtered = useMemo(() => {
    let list = [...modules];
    if (filterTarget === 'UNIVERSEL') list = list.filter(m => !m.types || m.types === '');
    else if (filterTarget !== 'ALL') list = list.filter(m => m.types && m.types.split(',').includes(filterTarget));

    if (statusFilter !== 'ALL') list = list.filter(m => m.status === statusFilter);

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(m =>
        m.name?.toLowerCase().includes(q) ||
        m.description?.toLowerCase().includes(q) ||
        m.route?.toLowerCase().includes(q)
      );
    }
    list.sort((a, b) => {
      if (sort === 'name') return (a.name || '').localeCompare(b.name || '');
      if (sort === 'price-asc') return (a.price || 0) - (b.price || 0);
      return (b.price || 0) - (a.price || 0);
    });
    return list;
  }, [modules, filterTarget, statusFilter, search, sort]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / perPage));
  const pageItems = filtered.slice((page - 1) * perPage, page * perPage);

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

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <p className="text-xs font-black text-teal-600 uppercase tracking-widest mb-1">Catalogue</p>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Modules & Services</h1>
          <p className="text-slate-500 mt-1">
            {kpis.total} module{kpis.total > 1 ? 's' : ''} · {kpis.paid} payant{kpis.paid > 1 ? 's' : ''} · {kpis.active} actif{kpis.active > 1 ? 's' : ''}
          </p>
        </div>
        {isOwner && (
          <Button
            onClick={openCreate}
            icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" /></svg>}
          >
            Ajouter un module
          </Button>
        )}
      </div>

      {/* KPI */}
      <div className="bg-slate-900 rounded-2xl p-5 text-white shadow-lg">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest mb-1">Total</p>
            <p className="text-2xl font-black">{kpis.total}</p>
            <p className="text-[10px] text-slate-500 mt-0.5">modules au catalogue</p>
          </div>
          <div>
            <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest mb-1">Actifs</p>
            <p className="text-2xl font-black text-emerald-400">{kpis.active}</p>
            <p className="text-[10px] text-slate-500 mt-0.5">disponibles a la vente</p>
          </div>
          <div>
            <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest mb-1">Prix moyen</p>
            <p className="text-2xl font-black text-amber-400">{Math.round(kpis.avgPrice).toLocaleString('fr-FR')}</p>
            <p className="text-[10px] text-slate-500 mt-0.5">Ar sur les payants</p>
          </div>
          <div>
            <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest mb-1">CA potentiel</p>
            <p className="text-2xl font-black text-cyan-400">{kpis.totalValue.toLocaleString('fr-FR')}</p>
            <p className="text-[10px] text-slate-500 mt-0.5">Ar / tenant / mois</p>
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-3 space-y-3">
        <div className="flex flex-col lg:flex-row gap-3 lg:items-center">
          <div className="relative flex-1">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
            </span>
            <input
              type="text"
              placeholder="Rechercher un module..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:ring-2 focus:ring-teal-400 focus:border-teal-400 focus:bg-white transition"
            />
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {/* View toggle */}
            <div className="flex items-center bg-slate-100 rounded-lg p-0.5">
              <button
                onClick={() => setView('grid')}
                title="Vue grille"
                className={'px-2.5 py-1.5 rounded-md text-xs font-bold transition flex items-center gap-1 ' + (view === 'grid' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700')}
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"/></svg>
                Grille
              </button>
              <button
                onClick={() => setView('table')}
                title="Vue tableau"
                className={'px-2.5 py-1.5 rounded-md text-xs font-bold transition flex items-center gap-1 ' + (view === 'table' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700')}
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16"/></svg>
                Tableau
              </button>
            </div>
            <select
              value={sort}
              onChange={e => setSort(e.target.value as any)}
              className="px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 cursor-pointer"
            >
              <option value="price-desc">Prix ↓</option>
              <option value="price-asc">Prix ↑</option>
              <option value="name">Nom A-Z</option>
            </select>
            <select
              value={perPage}
              onChange={e => setPerPage(parseInt(e.target.value))}
              className="px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 cursor-pointer"
            >
              <option value={24}>24 / page</option>
              <option value={48}>48 / page</option>
              <option value={96}>96 / page</option>
            </select>
          </div>
        </div>

        {/* Filter chips */}
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            onClick={() => setFilterTarget('ALL')}
            className={'px-3 py-1.5 rounded-lg text-xs font-bold transition ' + (filterTarget === 'ALL' ? 'bg-slate-900 text-white shadow' : 'bg-white border border-slate-200 text-slate-600 hover:border-slate-400')}
          >
            Tous <span className="opacity-60 ml-1">{counts.ALL}</span>
          </button>
          <button
            onClick={() => setFilterTarget('UNIVERSEL')}
            className={'px-3 py-1.5 rounded-lg text-xs font-bold transition ' + (filterTarget === 'UNIVERSEL' ? 'bg-slate-900 text-white shadow' : 'bg-white border border-slate-200 text-slate-600 hover:border-slate-400')}
          >
            Universel <span className="opacity-60 ml-1">{counts.UNIVERSEL}</span>
          </button>
          {AVAILABLE_TYPES.map(t => (
            <button
              key={t}
              onClick={() => setFilterTarget(t)}
              className={'px-3 py-1.5 rounded-lg text-xs font-bold transition ' + (filterTarget === t ? 'bg-slate-900 text-white shadow' : 'bg-white border border-slate-200 text-slate-600 hover:border-slate-400')}
            >
              {t} <span className="opacity-60 ml-1">{counts[t] || 0}</span>
            </button>
          ))}

          <span className="w-px h-5 bg-slate-200 mx-1"></span>

          {/* Status filter */}
          <button
            onClick={() => setStatusFilter('ALL')}
            className={'px-3 py-1.5 rounded-lg text-xs font-bold transition ' + (statusFilter === 'ALL' ? 'bg-slate-700 text-white shadow' : 'bg-white border border-slate-200 text-slate-600 hover:border-slate-400')}
          >
            Statut : Tous
          </button>
          <button
            onClick={() => setStatusFilter('ACTIVE')}
            className={'px-3 py-1.5 rounded-lg text-xs font-bold transition ' + (statusFilter === 'ACTIVE' ? 'bg-emerald-500 text-white shadow' : 'bg-white border border-emerald-200 text-emerald-700 hover:border-emerald-400')}
          >
            Actifs
          </button>
          <button
            onClick={() => setStatusFilter('INACTIVE')}
            className={'px-3 py-1.5 rounded-lg text-xs font-bold transition ' + (statusFilter === 'INACTIVE' ? 'bg-slate-500 text-white shadow' : 'bg-white border border-slate-200 text-slate-600 hover:border-slate-400')}
          >
            Inactifs
          </button>

          <span className="ml-auto text-xs text-slate-500">
            <span className="font-semibold">{filtered.length}</span> résultat{filtered.length > 1 ? 's' : ''}
            {(search || filterTarget !== 'ALL' || statusFilter !== 'ALL') && (
              <button
                onClick={() => { setSearch(''); setFilterTarget('ALL'); setStatusFilter('ALL'); }}
                className="ml-2 text-teal-600 hover:underline font-medium"
              >
                Effacer
              </button>
            )}
          </span>
        </div>
      </div>

      {/* Content */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-3xl border-2 border-dashed border-slate-200 p-16 text-center">
          <p className="text-lg font-bold text-slate-700 mb-1">
            {search || filterTarget !== 'ALL' || statusFilter !== 'ALL' ? 'Aucun module trouve' : 'Catalogue vide'}
          </p>
          <p className="text-sm text-slate-400">
            {search || filterTarget !== 'ALL' || statusFilter !== 'ALL' ? 'Modifiez vos filtres' : 'Ajoutez votre premier module'}
          </p>
        </div>
      ) : view === 'grid' ? (
        // ═══════════ VUE GRILLE ═══════════
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {pageItems.map(m => {
            const tier = priceTier(m.price || 0);
            const targets = m.types ? m.types.split(',') : [];
            const isActive = m.status === 'ACTIVE';
            const isMenuOpen = openMenu === m.id;

            return (
              <div key={m.id} className="group relative bg-white rounded-2xl border border-slate-200 overflow-hidden hover:shadow-lg transition-all duration-150">
                <div className="flex items-start gap-3 p-4 pb-2">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-black text-sm shrink-0 shadow-md" style={{ background: tier.color }}>
                    {m.name?.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <h3 className="font-black text-slate-900 text-sm truncate">{m.name}</h3>
                      {!isActive && <span className="text-[9px] font-black tracking-wider px-1.5 py-0.5 rounded bg-slate-200 text-slate-600 shrink-0">INACTIF</span>}
                    </div>
                    <p className="text-[10px] text-slate-400 font-mono truncate">{m.route || '/dashboard/...'}</p>
                  </div>
                  {isOwner && (
                    <div className="relative shrink-0">
                      <button
                        onClick={(e) => { e.stopPropagation(); setOpenMenu(isMenuOpen ? null : m.id); }}
                        className="w-7 h-7 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 flex items-center justify-center transition"
                      >
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><circle cx="5" cy="12" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="19" cy="12" r="1.5"/></svg>
                      </button>
                      {isMenuOpen && (
                        <div onClick={(e) => e.stopPropagation()} className="absolute right-0 mt-1 w-40 bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden z-20">
                          <button onClick={() => { setOpenMenu(null); openEdit(m); }} className="w-full text-left px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition">Modifier</button>
                          <button onClick={() => { setOpenMenu(null); setModuleToDelete(m); }} className="w-full text-left px-4 py-2.5 text-sm font-semibold text-red-600 hover:bg-red-50 transition border-t border-slate-100">Supprimer</button>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="px-4 pb-3 min-h-[32px]">
                  <p className="text-xs text-slate-500 line-clamp-2">{m.description || 'Aucune description.'}</p>
                </div>

                <div className={`mx-4 mb-3 rounded-xl border-2 ${tier.border} ${tier.bg} p-3 text-center`}>
                  <div className="flex items-center justify-center gap-1 mb-0.5">
                    <span className={`text-[9px] font-black tracking-widest ${tier.color}`}>{tier.label}</span>
                  </div>
                  {m.price > 0 ? (
                    <div className="flex items-baseline justify-center gap-1">
                      <span className="text-xl font-black text-slate-900 leading-none">{m.price.toLocaleString('fr-FR')}</span>
                      <span className="text-xs font-bold text-slate-500">Ar</span>
                    </div>
                  ) : (
                    <span className="text-xl font-black leading-none" style={{ color: tier.color }}>Gratuit</span>
                  )}
                  <p className="text-[9px] text-slate-400 mt-0.5">par mois et par tenant</p>
                </div>

                <div className="px-4 pb-3">
                  <p className="text-[9px] font-black text-slate-400 tracking-widest uppercase mb-1">Cibles</p>
                  <div className="flex flex-wrap gap-1">
                    {targets.length === 0 ? (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-gradient-to-r from-slate-700 to-slate-900 text-white">Universel</span>
                    ) : (
                      targets.map((t: string) => (
                        <span key={t} className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 border border-slate-200">{t}</span>
                      ))
                    )}
                  </div>
                </div>

                <div className="border-t border-slate-100 px-4 py-2 bg-slate-50/50 flex items-center justify-between">
                  <span className={`inline-flex items-center gap-1.5 text-[10px] font-black ${isActive ? 'text-emerald-600' : 'text-slate-400'}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-emerald-500' : 'bg-slate-400'}`}></span>
                    {isActive ? 'DISPONIBLE' : 'HORS LIGNE'}
                  </span>
                  {isOwner && (
                    <button onClick={() => openEdit(m)} className="text-xs font-black text-teal-600 hover:text-teal-700 transition">Modifier</button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        // ═══════════ VUE TABLEAU ═══════════
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="p-3 text-[10px] font-black text-slate-500 uppercase tracking-wider">Module</th>
                  <th className="p-3 text-[10px] font-black text-slate-500 uppercase tracking-wider hidden md:table-cell">Route</th>
                  <th className="p-3 text-[10px] font-black text-slate-500 uppercase tracking-wider hidden lg:table-cell">Cibles</th>
                  <th className="p-3 text-[10px] font-black text-slate-500 uppercase tracking-wider text-right">Prix</th>
                  <th className="p-3 text-[10px] font-black text-slate-500 uppercase tracking-wider text-center">Statut</th>
                  {isOwner && <th className="p-3 text-[10px] font-black text-slate-500 uppercase tracking-wider text-center w-32">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {pageItems.map(m => {
                  const tier = priceTier(m.price || 0);
                  const targets = m.types ? m.types.split(',') : [];
                  const isActive = m.status === 'ACTIVE';
                  return (
                    <tr key={m.id} className="hover:bg-slate-50 transition group">
                      <td className="p-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-black text-xs shrink-0" style={{ background: tier.color }}>
                            {m.name?.charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <p className="font-bold text-slate-900 text-sm truncate">{m.name}</p>
                            <p className="text-[10px] text-slate-400 truncate md:hidden">{m.route || '-'}</p>
                          </div>
                        </div>
                      </td>
                      <td className="p-3 hidden md:table-cell">
                        <span className="font-mono text-[11px] text-slate-500">{m.route || '-'}</span>
                      </td>
                      <td className="p-3 hidden lg:table-cell">
                        {targets.length === 0 ? (
                          <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-slate-900 text-white">UNIVERSEL</span>
                        ) : (
                          <div className="flex flex-wrap gap-0.5">
                            {targets.slice(0, 3).map((t: string) => (
                              <span key={t} className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">{t}</span>
                            ))}
                            {targets.length > 3 && <span className="text-[9px] text-slate-400 font-bold">+{targets.length - 3}</span>}
                          </div>
                        )}
                      </td>
                      <td className="p-3 text-right">
                        {m.price > 0 ? (
                          <span className="font-black text-slate-900 tabular-nums">{m.price.toLocaleString('fr-FR')} <span className="text-xs font-bold text-slate-500">Ar</span></span>
                        ) : (
                          <span className="font-black text-emerald-600">Gratuit</span>
                        )}
                      </td>
                      <td className="p-3 text-center">
                        <span className={'inline-flex items-center gap-1 text-[10px] font-black tracking-wider px-2 py-0.5 rounded-md ' + (isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600')}>
                          <span className={'w-1 h-1 rounded-full ' + (isActive ? 'bg-emerald-500' : 'bg-slate-400')}></span>
                          {isActive ? 'ACTIF' : 'INACTIF'}
                        </span>
                      </td>
                      {isOwner && (
                        <td className="p-3 text-center">
                          <div className="flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition">
                            <button onClick={() => openEdit(m)} className="w-7 h-7 rounded-lg hover:bg-blue-50 text-slate-400 hover:text-blue-600 flex items-center justify-center transition" title="Modifier">
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
                            </button>
                            <button onClick={() => setModuleToDelete(m)} className="w-7 h-7 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-600 flex items-center justify-center transition" title="Supprimer">
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M1 7h22M9 7V4a2 2 0 012-2h2a2 2 0 012 2v3"/></svg>
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between flex-wrap gap-3 py-2">
          <div className="text-xs text-slate-500">
            Page <span className="font-bold text-slate-900">{page}</span> sur <span className="font-bold text-slate-900">{totalPages}</span>
            {' · '}{filtered.length} résultat{filtered.length > 1 ? 's' : ''}
          </div>
          <div className="flex items-center gap-1">
            <button onClick={() => setPage(Math.max(1, page - 1))} disabled={page === 1}
              className="px-3 h-9 rounded-lg bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed font-bold text-sm transition">
              ← Precedent
            </button>
            <span className="px-3 text-sm font-bold text-slate-700">{page} / {totalPages}</span>
            <button onClick={() => setPage(Math.min(totalPages, page + 1))} disabled={page === totalPages}
              className="px-3 h-9 rounded-lg bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed font-bold text-sm transition">
              Suivant →
            </button>
          </div>
        </div>
      )}

      {/* Modal create/edit — inchangé */}
      <Modal
        open={showModal}
        onClose={() => { setShowModal(false); resetForm(); }}
        title={editing ? 'Modifier le module' : 'Nouveau module'}
        subtitle={editing ? editing.name : 'Ajoutez un module au catalogue'}
        icon={<span className="text-2xl font-bold">+</span>}
        footer={
          <div className="flex gap-3">
            <Button variant="secondary" onClick={() => { setShowModal(false); resetForm(); }}>Annuler</Button>
            <button type="submit" form="module-form" disabled={saving}
              className="flex-1 bg-linear-to-r from-blue-600 to-teal-500 text-white py-2.5 rounded-xl font-semibold hover:shadow-lg transition disabled:opacity-50">
              {saving ? 'Enregistrement...' : editing ? 'Enregistrer' : 'Creer le module'}
            </button>
          </div>
        }
      >
        <form id="module-form" onSubmit={save} className="space-y-6">
          {error && <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">{error}</div>}

          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-1 h-4 bg-linear-to-b from-blue-500 to-teal-500 rounded-full"></div>
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Informations</h3>
            </div>
            <div className="space-y-4">
              <FormField label="Nom du module" required>
                <Input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Clients, Caisse, Stock..." required />
              </FormField>
              <FormField label="Description">
                <Textarea value={description} onChange={e => setDescription(e.target.value)} rows={3} placeholder="Que fait ce module ?" />
              </FormField>
            </div>
          </div>

          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-1 h-4 bg-linear-to-b from-blue-500 to-teal-500 rounded-full"></div>
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Ciblage et prix par type</h3>
            </div>
            <div className="border border-gray-200 rounded-xl p-3 space-y-2">
              {AVAILABLE_TYPES.map(t => (
                <div key={t} className={'flex items-center gap-3 p-2 rounded-lg transition ' + (types.includes(t) ? 'bg-teal-50' : 'hover:bg-slate-50')}>
                  <label className="flex items-center gap-2 cursor-pointer flex-1 min-w-0">
                    <input type="checkbox" checked={types.includes(t)} onChange={() => toggleType(t)} className="w-4 h-4 text-teal-600 rounded focus:ring-teal-500 shrink-0" />
                    <span className="text-sm font-bold text-slate-700">{t}</span>
                  </label>
                  {types.includes(t) && (
                    <div className="flex items-center gap-2 shrink-0">
                      <input type="number" placeholder={price || '0'} value={pricing[t] ?? ''}
                        onChange={e => setPricingField(t, e.target.value)}
                        className="w-28 px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-sm font-bold text-slate-900 tabular-nums focus:ring-2 focus:ring-teal-400 focus:border-teal-400" />
                      <span className="text-xs font-bold text-slate-500">Ar</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
            <p className="text-xs text-slate-400 mt-2">
              {types.length === 0 ? 'Aucun coche = module universel (prix unique ci-dessous)' : 'Prix specifiques par type. Laisser vide = utilise le prix universel.'}
            </p>
          </div>

          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-1 h-4 bg-linear-to-b from-blue-500 to-teal-500 rounded-full"></div>
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Route et prix</h3>
            </div>
            <div className="space-y-4">
              <FormField label="Route (chemin de la page)">
                <div className="flex gap-2">
                  <Input type="text" value={route} onChange={e => { setRoute(e.target.value); setRouteManuallyEdited(true); }} placeholder="/dashboard/crm" className="font-mono text-sm" />
                  <button type="button" onClick={() => { setRouteManuallyEdited(false); setRoute('/dashboard/' + slugify(name)); }}
                    className="px-3 py-2 bg-slate-100 rounded-xl text-xs font-medium hover:bg-slate-200 shrink-0">Auto</button>
                </div>
                <p className="text-xs text-slate-400 mt-1">{routeManuallyEdited ? 'Modifie manuellement' : 'Auto-genere depuis le nom'}</p>
              </FormField>

              <div className="grid grid-cols-2 gap-4">
                <FormField label={types.length > 0 ? 'Prix universel de secours (Ar)' : 'Prix (Ar)'}>
                  <Input type="number" value={price} onChange={e => setPrice(e.target.value)} placeholder="30000" />
                </FormField>
                <FormField label="Statut">
                  <Select value={status} onChange={e => setStatus(e.target.value)}>
                    <option value="ACTIVE">Actif</option>
                    <option value="INACTIVE">Inactif</option>
                  </Select>
                </FormField>
              </div>
            </div>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!moduleToDelete}
        title="Supprimer le module"
        message={'Voulez-vous vraiment supprimer "' + (moduleToDelete?.name || '') + '" ?'}
        onClose={() => setModuleToDelete(null)}
        onConfirm={confirmDelete}
        isLoading={isDeleting}
      />
    </div>
  );
}
