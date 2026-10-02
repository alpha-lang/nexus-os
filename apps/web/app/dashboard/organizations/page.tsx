'use client';

import { useState, useEffect, useMemo } from 'react';
import { apiFetch, unwrap } from '../../../lib/api';
import ConfirmDialog from '../../../components/ConfirmDialog';
import { Modal, Button, FormField, Input, Select, Textarea } from '../../../components/ui';
import OrganizationWizard from '../../../components/OrganizationWizard';

// ═════════════════════════════════════════════════════════════
//  CONSTANTES
// ═════════════════════════════════════════════════════════════

const ORG_TYPES = [
  { value: 'COMMERCE', label: 'Commerce', short: 'COM', grad: 'from-blue-500 to-cyan-500' },
  { value: 'HOTEL', label: 'Hôtel', short: 'HTL', grad: 'from-purple-500 to-pink-500' },
  { value: 'RESTAURANT', label: 'Restaurant', short: 'RST', grad: 'from-orange-500 to-red-600' },
  { value: 'ECOLE', label: 'École', short: 'ECL', grad: 'from-sky-500 to-indigo-500' },
  { value: 'CLINIQUE', label: 'Clinique', short: 'CLN', grad: 'from-teal-500 to-emerald-600' },
  { value: 'ONG', label: 'ONG', short: 'ONG', grad: 'from-green-500 to-emerald-500' },
  { value: 'MICROFINANCE', label: 'Microfinance', short: 'MFC', grad: 'from-amber-500 to-orange-500' },
  { value: 'BANQUE', label: 'Banque', short: 'BNQ', grad: 'from-slate-600 to-slate-800' },
  { value: 'INTERNE', label: 'Interne', short: 'NEX', grad: 'from-rose-500 to-red-600' },
];

type ViewMode = 'table' | 'cards';
type SortKey = 'name' | 'type' | 'status' | 'users' | 'clients' | 'createdAt' | 'mrr';
type SortDir = 'asc' | 'desc';
type StatusFilter = 'ALL' | 'ACTIVE' | 'SUSPENDED' | 'INACTIVE';
type AboFilter = 'ALL' | 'ACTIVE' | 'TRIAL' | 'SUSPENDED' | 'EXPIRED' | 'NONE';

function typeMeta(t: string | null) {
  return ORG_TYPES.find(x => x.value === t) || ORG_TYPES[0];
}

function statusMeta(s: string) {
  if (s === 'ACTIVE') return { label: 'Active', dot: 'bg-emerald-500', text: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-200' };
  if (s === 'SUSPENDED') return { label: 'Suspendue', dot: 'bg-amber-500', text: 'text-amber-700', bg: 'bg-amber-50', border: 'border-amber-200' };
  return { label: 'Inactive', dot: 'bg-slate-400', text: 'text-slate-600', bg: 'bg-slate-50', border: 'border-slate-200' };
}

function aboMeta(s: string | null) {
  if (s === 'ACTIVE') return { label: 'Actif', color: '#10b981' };
  if (s === 'TRIAL') return { label: 'Essai', color: '#3b82f6' };
  if (s === 'SUSPENDED') return { label: 'Suspendu', color: '#f59e0b' };
  if (s === 'EXPIRED') return { label: 'Expiré', color: '#dc2626' };
  return { label: 'Aucun', color: '#94a3b8' };
}

function getActiveAbo(org: any): {
  status: string | null;
  mrr: number;        // Revenu RÉEL (uniquement si ACTIVE)
  pipeline: number;   // Revenu POTENTIEL (si TRIAL)
} {
  const subs = org.subscriptions || [];
  if (subs.length === 0) return { status: null, mrr: 0, pipeline: 0 };

  const active = subs.find((s: any) => s.status === 'ACTIVE')
    || subs.find((s: any) => s.status === 'TRIAL')
    || subs[0];

  const modulesTotal = (active.activeModules || [])
    .filter((am: any) => am.isActive)
    .reduce((sum: number, am: any) => sum + (am.module?.price || 0), 0);

  // MRR = uniquement si l'abonnement est ACTIVE
  const mrr = active.status === 'ACTIVE' ? modulesTotal : 0;
  // Pipeline = uniquement si TRIAL (revenus futurs potentiels)
  const pipeline = active.status === 'TRIAL' ? modulesTotal : 0;

  return { status: active.status, mrr, pipeline };
}

// ═════════════════════════════════════════════════════════════
//  HOOK : détection mobile
// ═════════════════════════════════════════════════════════════

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)');
    const handler = () => setIsMobile(mq.matches);
    handler();
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);
  return isMobile;
}

// ═════════════════════════════════════════════════════════════
//  PAGE
// ═════════════════════════════════════════════════════════════

export default function OrganizationsPage() {
  const [organizations, setOrganizations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<ViewMode>('table');
  const isMobile = useIsMobile();
  const effectiveView: ViewMode = isMobile ? 'cards' : view;

  // Filtres
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<string>('ALL');
  const [filterStatus, setFilterStatus] = useState<StatusFilter>('ALL');
  const [filterAbo, setFilterAbo] = useState<AboFilter>('ALL');

  // Tri
  const [sortKey, setSortKey] = useState<SortKey>('createdAt');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  // Pagination
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(25);

  // Modal CRUD
  const [showModal, setShowModal] = useState(false);
  const [showWizard, setShowWizard] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [orgToDelete, setOrgToDelete] = useState<any>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [openMenu, setOpenMenu] = useState<string | null>(null);

  // Suspend modal
  const [suspendModal, setSuspendModal] = useState<any>(null);
  const [reactivateModal, setReactivateModal] = useState<any>(null);
  const [reactivating, setReactivating] = useState(false);
  const [suspendReason, setSuspendReason] = useState('');
  const [suspending, setSuspending] = useState(false);
  const [suspendError, setSuspendError] = useState<string | null>(null);

  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [type, setType] = useState('COMMERCE');
  const [city, setCity] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [description, setDescription] = useState('');

  const isOwner = typeof window !== 'undefined' && localStorage.getItem('isOwner') === 'true';
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : '';

  async function load() {
    const res = await apiFetch('/api/organizations', { headers: { Authorization: `Bearer ${token}` } });
    const data = await res.json();
    setOrganizations(Array.isArray(data) ? data : []);
  }

  useEffect(() => {
    load().catch(console.error).finally(() => setLoading(false));
    const closeMenu = () => setOpenMenu(null);
    document.addEventListener('click', closeMenu);
    return () => document.removeEventListener('click', closeMenu);
  }, []);

  useEffect(() => { setPage(1); }, [search, filterType, filterStatus, filterAbo, sortKey, sortDir, perPage]);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  }

  function resetForm() {
    setEditing(null);
    setName(''); setSlug(''); setType('COMMERCE'); setCity('');
    setEmail(''); setPhone(''); setDescription('');
    setError(null);
  }

  function openCreate() { setShowWizard(true); }

  function handleWizardSuccess(org: any) {
    setShowWizard(false);
    showToast(`Organisation "${org.name}" créée`);
    load();
  }

  function openEdit(org: any) {
    setEditing(org);
    setName(org.name || ''); setSlug(org.slug || ''); setType(org.type || 'COMMERCE');
    setCity(org.city || ''); setEmail(org.email || ''); setPhone(org.phone || '');
    setDescription(org.description || '');
    setError(null);
    setShowModal(true);
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setError(null); setSaving(true);
    const method = editing ? 'PATCH' : 'POST';
    const url = editing ? `/api/organizations/${editing.id}` : '/api/organizations';
    const res = await apiFetch(url, {
      method,
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, slug, type, city, email, phone, description }),
    });
    setSaving(false);
    if (res.ok) {
      showToast(editing ? 'Organisation mise à jour' : 'Organisation créée');
      setShowModal(false);
      resetForm();
      await load();
    } else {
      const data = await res.json();
      setError(data.message || 'Erreur');
    }
  }

  async function confirmDelete() {
    if (!orgToDelete) return;
    setIsDeleting(true);
    await apiFetch(`/api/organizations/${orgToDelete.id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    setOrgToDelete(null);
    setIsDeleting(false);
    showToast('Organisation supprimée');
    await load();
  }

  // ═══ Suspend / Reactivate ═══
  function openSuspendModal(org: any) {
    setOpenMenu(null);
    setSuspendModal(org);
    setSuspendReason('');
    setSuspendError(null);
  }

  async function confirmSuspend(e: React.FormEvent) {
    e.preventDefault();
    if (!suspendModal) return;
    setSuspending(true);
    setSuspendError(null);

    try {
      const res = await apiFetch(`/api/organizations/${suspendModal.id}/suspend`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: suspendReason }),
      });

      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.message || 'Erreur');
      }

      showToast(`Organisation "${suspendModal.name}" suspendue`);
      setSuspendModal(null);
      setSuspendReason('');
      await load();
    } catch (err: any) {
      setSuspendError(err.message);
    } finally {
      setSuspending(false);
    }
  }

  function openReactivateModal(org: any) {
    setOpenMenu(null);
    setReactivateModal(org);
  }

  async function confirmReactivate() {
    if (!reactivateModal) return;
    setReactivating(true);
    try {
      const res = await apiFetch(`/api/organizations/${reactivateModal.id}/reactivate`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        showToast(`Organisation "${reactivateModal.name}" réactivée`);
        setReactivateModal(null);
        await load();
      } else {
        const d = await res.json();
        showToast(d.message || 'Erreur');
      }
    } finally {
      setReactivating(false);
    }
  }

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('desc'); }
  }

  // ═══ Comptes par filtre ═══
  const counts = useMemo(() => {
    const c: Record<string, number> = { ALL: organizations.length };
    ORG_TYPES.forEach(t => { c[t.value] = organizations.filter(o => o.type === t.value).length; });
    return c;
  }, [organizations]);

  // ═══ Filtre + tri ═══
  const filtered = useMemo(() => {
    let list = [...organizations];

    if (filterType !== 'ALL') list = list.filter(o => o.type === filterType);
    if (filterStatus !== 'ALL') list = list.filter(o => (o.status || 'ACTIVE') === filterStatus);
    if (filterAbo !== 'ALL') {
      list = list.filter(o => {
        const abo = getActiveAbo(o);
        if (filterAbo === 'NONE') return abo.status === null;
        return abo.status === filterAbo;
      });
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(o =>
        o.name?.toLowerCase().includes(q) ||
        o.slug?.toLowerCase().includes(q) ||
        o.city?.toLowerCase().includes(q)
      );
    }

    list.sort((a, b) => {
      let va: any, vb: any;
      switch (sortKey) {
        case 'name': va = a.name?.toLowerCase() || ''; vb = b.name?.toLowerCase() || ''; break;
        case 'type': va = a.type || ''; vb = b.type || ''; break;
        case 'status': va = a.status || 'ACTIVE'; vb = b.status || 'ACTIVE'; break;
        case 'users': va = a._count?.users || 0; vb = b._count?.users || 0; break;
        case 'clients': va = a._count?.partners || 0; vb = b._count?.partners || 0; break;
        case 'mrr': va = getActiveAbo(a).mrr; vb = getActiveAbo(b).mrr; break;
        default: va = new Date(a.createdAt).getTime(); vb = new Date(b.createdAt).getTime();
      }
      if (va < vb) return sortDir === 'asc' ? -1 : 1;
      if (va > vb) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });

    return list;
  }, [organizations, search, filterType, filterStatus, filterAbo, sortKey, sortDir]);

  // ═══ Pagination ═══
  const totalPages = Math.max(1, Math.ceil(filtered.length / perPage));
  const currentPage = Math.min(page, totalPages);
  const pageItems = useMemo(
    () => filtered.slice((currentPage - 1) * perPage, currentPage * perPage),
    [filtered, currentPage, perPage]
  );

  // ═══ KPI ═══
  const kpis = useMemo(() => {
    const total = organizations.length;
    const clientOrgs = organizations.filter(o => o.type !== 'INTERNE');
    const active = clientOrgs.filter(o => (o.status || 'ACTIVE') === 'ACTIVE').length;
    const totalMrr = clientOrgs.reduce((s, o) => s + getActiveAbo(o).mrr, 0);
    const totalPipeline = clientOrgs.reduce((s, o) => s + getActiveAbo(o).pipeline, 0);
    const totalUsers = organizations.reduce((s, o) => s + (o._count?.users || 0), 0);
    return { total, clients: clientOrgs.length, active, totalMrr, totalPipeline, totalUsers };
  }, [organizations]);

  function exportCsv() {
    const headers = ['Nom', 'Slug', 'Type', 'Statut', 'Ville', 'Users', 'Clients', 'MRR', 'Créée le'];
    const rows = filtered.map(o => [
      o.name, o.slug, o.type || '', o.status || 'ACTIVE', o.city || '',
      o._count?.users || 0, o._count?.partners || 0, getActiveAbo(o).mrr,
      new Date(o.createdAt).toLocaleDateString('fr-FR'),
    ]);
    const csv = [headers, ...rows].map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(';')).join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `organisations-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-10 w-10 border-4 border-teal-400 border-t-transparent"></div>
      </div>
    );
  }

  const hasFilters = search || filterType !== 'ALL' || filterStatus !== 'ALL' || filterAbo !== 'ALL';

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
          <p className="text-xs font-black text-teal-600 uppercase tracking-widest mb-1">Multi-tenant</p>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">Organisations</h1>
          <p className="text-slate-500 mt-1">
            {kpis.clients} tenant{kpis.clients > 1 ? 's' : ''} client{kpis.clients > 1 ? 's' : ''} · {kpis.active} actif{kpis.active > 1 ? 's' : ''}
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          <button
            onClick={exportCsv}
            className="w-full sm:w-auto px-4 py-2.5 bg-white border-2 border-slate-300 rounded-xl text-sm font-semibold text-slate-700 hover:bg-slate-100 transition inline-flex items-center justify-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3M3 17V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
            </svg>
            Export CSV
          </button>
          {isOwner && (
            <div className="w-full sm:w-auto">
              <Button
                onClick={openCreate}
                icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" /></svg>}
                className="w-full sm:w-auto"
              >
                Nouvelle organisation
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* KPI bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-slate-900 rounded-2xl p-3 sm:p-4 text-white">
          <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest mb-1">Tenants clients</p>
          <p className="text-xl sm:text-xl sm:text-2xl font-black tabular-nums text-teal-400">{kpis.clients}</p>
          <p className="text-[10px] text-slate-500 mt-0.5">{kpis.active} actifs</p>
        </div>
        <div className="bg-white rounded-2xl p-3 sm:p-4 border border-slate-200">
          <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest mb-1">Utilisateurs</p>
          <p className="text-xl sm:text-xl sm:text-2xl font-black text-slate-900 tabular-nums">{kpis.totalUsers}</p>
          <p className="text-[10px] text-slate-400 mt-0.5">tous tenants confondus</p>
        </div>
        <div className="bg-white rounded-2xl p-3 sm:p-4 border border-emerald-200">
          <p className="text-[10px] text-emerald-700 uppercase font-black tracking-widest mb-1">MRR total</p>
          <p className="text-xl sm:text-xl sm:text-2xl font-black text-emerald-600 tabular-nums">{kpis.totalMrr.toLocaleString('fr-FR')}</p>
          <p className="text-[10px] text-slate-400 mt-0.5">Ar / mois</p>
        </div>
        <div className="bg-white rounded-2xl p-4 border border-slate-200">
          <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest mb-1">Total</p>
          <p className="text-xl sm:text-xl sm:text-2xl font-black text-slate-900 tabular-nums">{kpis.total}</p>
          <p className="text-[10px] text-slate-400 mt-0.5">avec interne</p>
        </div>
      </div>

      {/* Barre de filtres */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-3 space-y-3">
        {/* Recherche + vue toggle */}
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </span>
            <input
              type="text"
              placeholder="Rechercher un tenant par nom, slug, ville…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full max-w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:ring-2 focus:ring-teal-400 focus:border-teal-400 focus:bg-white transition"
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-700">✕</button>
            )}
          </div>

          {/* Toggle vue */}
          <div className="hidden md:flex items-center bg-slate-100 rounded-xl p-0.5 shrink-0">
            <button
              onClick={() => setView('table')}
              className={'px-3 py-1.5 rounded-lg text-xs font-bold transition inline-flex items-center gap-1.5 ' + (view === 'table' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700')}
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
              Tableau
            </button>
            <button
              onClick={() => setView('cards')}
              className={'px-3 py-1.5 rounded-lg text-xs font-bold transition inline-flex items-center gap-1.5 ' + (view === 'cards' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700')}
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
              </svg>
              Cards
            </button>
          </div>
        </div>

        {/* Chips de filtre type */}
        <div className="w-full overflow-x-auto scroll-x pb-1">
        <div className="flex flex-nowrap items-center gap-1.5 w-max">
          <button
            onClick={() => setFilterType('ALL')}
            className={'px-3 py-1.5 rounded-lg text-xs font-bold transition ' + (filterType === 'ALL' ? 'bg-slate-900 text-white shadow' : 'bg-white border border-slate-200 text-slate-600 hover:border-slate-400')}
          >
            Tous <span className="opacity-60 ml-1">{counts.ALL}</span>
          </button>
          {ORG_TYPES.map(t => (
            <button
              key={t.value}
              onClick={() => setFilterType(t.value)}
              className={'px-3 py-1.5 rounded-lg text-xs font-bold transition ' + (filterType === t.value ? `bg-gradient-to-r ${t.grad} text-white shadow` : 'bg-white border border-slate-200 text-slate-600 hover:border-slate-400')}
            >
              {t.label} <span className="opacity-60 ml-1">{counts[t.value] || 0}</span>
            </button>
          ))}
          </div>
        </div>

        {/* Filtres avancés */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100">
          <select
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value as StatusFilter)}
            className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-700 cursor-pointer"
          >
            <option value="ALL">Tous statuts</option>
            <option value="ACTIVE">Actives</option>
            <option value="SUSPENDED">Suspendues</option>
            <option value="INACTIVE">Inactives</option>
          </select>

          <select
            value={filterAbo}
            onChange={e => setFilterAbo(e.target.value as AboFilter)}
            className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-700 cursor-pointer"
          >
            <option value="ALL">Tous abonnements</option>
            <option value="ACTIVE">Abonnement actif</option>
            <option value="TRIAL">Essai</option>
            <option value="SUSPENDED">Suspendu</option>
            <option value="EXPIRED">Expiré</option>
            <option value="NONE">Aucun abonnement</option>
          </select>

          <select
            value={perPage}
            onChange={e => setPerPage(parseInt(e.target.value))}
            className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-700 cursor-pointer"
          >
            <option value={25}>25 / page</option>
            <option value={50}>50 / page</option>
            <option value={100}>100 / page</option>
          </select>

          <span className="ml-auto text-xs font-bold text-slate-500">
            {filtered.length} résultat{filtered.length > 1 ? 's' : ''}
          </span>

          {hasFilters && (
            <button
              onClick={() => { setSearch(''); setFilterType('ALL'); setFilterStatus('ALL'); setFilterAbo('ALL'); }}
              className="text-xs font-bold text-teal-600 hover:underline"
            >
              Réinitialiser
            </button>
          )}
        </div>
      </div>

      {/* Contenu */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-3xl border-2 border-dashed border-slate-200 p-16 text-center">
          <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-10 h-10 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>
          <p className="text-lg font-bold text-slate-700 mb-1">
            {hasFilters ? 'Aucun résultat' : 'Aucune organisation'}
          </p>
          <p className="text-sm text-slate-400">
            {hasFilters ? 'Essayez de modifier vos filtres' : 'Créez votre premier tenant'}
          </p>
        </div>
      ) : effectiveView === 'table' ? (
        // ═══════════════════════ VUE TABLEAU ═══════════════════════
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="scroll-x overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 border-b-2 border-slate-200">
                <tr>
                  <Th sortKey="name" current={sortKey} dir={sortDir} onSort={toggleSort}>Nom</Th>
                  <Th sortKey="type" current={sortKey} dir={sortDir} onSort={toggleSort}>Type</Th>
                  <Th sortKey="status" current={sortKey} dir={sortDir} onSort={toggleSort}>Statut</Th>
                  <Th sortKey="users" current={sortKey} dir={sortDir} onSort={toggleSort} align="right">Users</Th>
                  <Th sortKey="clients" current={sortKey} dir={sortDir} onSort={toggleSort} align="right">Clients</Th>
                  <th className="p-3 text-[10px] font-black text-slate-500 uppercase tracking-wider text-left">Abo.</th>
                  <Th sortKey="mrr" current={sortKey} dir={sortDir} onSort={toggleSort} align="right">MRR</Th>
                  <Th sortKey="createdAt" current={sortKey} dir={sortDir} onSort={toggleSort}>Créée</Th>
                  <th className="p-3 text-[10px] font-black text-slate-500 uppercase tracking-wider text-center w-32">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {pageItems.map(org => {
                  const tm = typeMeta(org.type);
                  const sm = statusMeta(org.status || 'ACTIVE');
                  const abo = getActiveAbo(org);
                  const abm = aboMeta(abo.status);
                  const isMenuOpen = openMenu === org.id;
                  return (
                    <tr key={org.id} className="hover:bg-slate-50/60 transition group">
                      <td className="p-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className={'w-9 h-9 rounded-xl bg-gradient-to-br ' + tm.grad + ' flex items-center justify-center text-white font-black text-xs shrink-0 shadow-sm'}>
                            {org.name?.charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <p className="font-bold text-slate-900 text-sm truncate">{org.name}</p>
                            <p className="text-[10px] text-slate-400 font-mono truncate">{org.slug}</p>
                          </div>
                        </div>
                      </td>
                      <td className="p-3">
                        <span className="text-[10px] font-black tracking-wider px-2 py-1 rounded-md bg-slate-100 text-slate-700">
                          {tm.label.toUpperCase()}
                        </span>
                      </td>
                      <td className="p-3">
                        <span className={'inline-flex items-center gap-1.5 text-[10px] font-bold px-2 py-1 rounded-full ' + sm.bg + ' ' + sm.text}>
                          <span className={'w-1.5 h-1.5 rounded-full ' + sm.dot}></span>
                          {sm.label}
                        </span>
                      </td>
                      <td className="p-3 text-right font-bold text-slate-900 tabular-nums">
                        {org._count?.users || 0}
                      </td>
                      <td className="p-3 text-right font-bold text-slate-900 tabular-nums">
                        {org._count?.partners || 0}
                      </td>
                      <td className="p-3">
                        <span className="inline-flex items-center gap-1.5 text-[10px] font-bold" style={{ color: abm.color }}>
                          <span className="w-1.5 h-1.5 rounded-full" style={{ background: abm.color }}></span>
                          {abm.label}
                        </span>
                      </td>
                      <td className="p-3 text-right font-black tabular-nums whitespace-nowrap">
                        {abo.mrr > 0 ? (
                          <span className="text-emerald-600">{abo.mrr.toLocaleString('fr-FR')} Ar</span>
                        ) : abo.pipeline > 0 ? (
                          <span className="text-amber-600 text-xs italic" title="Pipeline (essai en cours)">
                            {abo.pipeline.toLocaleString('fr-FR')} Ar*
                          </span>
                        ) : (
                          <span className="text-slate-300">—</span>
                        )}
                      </td>
                      <td className="p-3 text-xs text-slate-500 whitespace-nowrap">
                        {new Date(org.createdAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: '2-digit' })}
                      </td>
                      <td className="p-3">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => openEdit(org)}
                            title="Modifier"
                            className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-blue-100 text-slate-500 hover:text-blue-600 flex items-center justify-center transition"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                          {(org.status || 'ACTIVE') === 'ACTIVE' ? (
                            <button
                              onClick={() => openSuspendModal(org)}
                              title="Suspendre"
                              className="w-7 h-7 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-600 flex items-center justify-center transition"
                            >
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                              </svg>
                            </button>
                          ) : org.status === 'SUSPENDED' ? (
                            <button
                              onClick={() => openReactivateModal(org)}
                              title="Réactiver"
                              className="w-7 h-7 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-600 flex items-center justify-center transition"
                            >
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                            </button>
                          ) : null}
                          <button
                            onClick={() => setOrgToDelete(org)}
                            title="Supprimer"
                            className="w-7 h-7 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 flex items-center justify-center transition"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M1 7h22M9 7V4a2 2 0 012-2h2a2 2 0 012 2v3" />
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
      ) : (
        // ═══════════════════════ VUE CARDS ═══════════════════════
        <div className="cv-grid grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {pageItems.map(org => {
            const tm = typeMeta(org.type);
            const sm = statusMeta(org.status || 'ACTIVE');
            const abo = getActiveAbo(org);
            const abm = aboMeta(abo.status);
            const isMenuOpen = openMenu === org.id;
            return (
              <div key={org.id} className="group bg-white rounded-3xl border border-slate-200 overflow-hidden hover:shadow-xl hover:-translate-y-1 transition-all duration-200">
                <div className={`h-24 bg-gradient-to-br ${tm.grad} relative overflow-hidden`}>
                  <div className="absolute -top-8 -right-8 w-32 h-32 rounded-full bg-white/10"></div>
                  <div className="absolute -bottom-6 -left-6 w-24 h-24 rounded-full bg-white/10"></div>
                  <div className="absolute top-3 left-3">
                    <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-white/25 backdrop-blur-sm text-white text-[10px] font-black tracking-wider">
                      {tm.short}
                    </span>
                  </div>
                  {isOwner && (
                    <div className="absolute top-3 right-3">
                      <button
                        onClick={(e) => { e.stopPropagation(); setOpenMenu(isMenuOpen ? null : org.id); }}
                        className="w-8 h-8 rounded-lg bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white flex items-center justify-center transition"
                      >
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                          <circle cx="5" cy="12" r="1.5" /><circle cx="12" cy="12" r="1.5" /><circle cx="19" cy="12" r="1.5" />
                        </svg>
                      </button>
                      {isMenuOpen && (
                        <div onClick={(e) => e.stopPropagation()} className="absolute right-0 mt-2 w-40 bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden z-20 text-left">
                          <button onClick={() => { setOpenMenu(null); openEdit(org); }} className="w-full text-left px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition">Modifier</button>
                          {(org.status || 'ACTIVE') === 'ACTIVE' ? (
                            <button onClick={() => openSuspendModal(org)} className="w-full text-left px-4 py-2.5 text-sm font-semibold text-amber-600 hover:bg-amber-50 transition border-t border-slate-100">Suspendre</button>
                          ) : org.status === 'SUSPENDED' ? (
                            <button onClick={() => openReactivateModal(org)} className="w-full text-left px-4 py-2.5 text-sm font-semibold text-emerald-600 hover:bg-emerald-50 transition border-t border-slate-100">Réactiver</button>
                          ) : null}
                          <button onClick={() => { setOpenMenu(null); setOrgToDelete(org); }} className="w-full text-left px-4 py-2.5 text-sm font-semibold text-red-600 hover:bg-red-50 transition border-t border-slate-100">Supprimer</button>
                        </div>
                      )}
                    </div>
                  )}
                  <div className="absolute -bottom-7 left-4">
                    <div className="w-14 h-14 rounded-2xl bg-white shadow-lg flex items-center justify-center text-xl sm:text-2xl font-black text-slate-900 border-4 border-white">
                      {org.name?.charAt(0).toUpperCase()}
                    </div>
                  </div>
                </div>
                <div className="pt-9 px-5 pb-5">
                  <h3 className="font-black text-slate-900 text-base truncate leading-tight">{org.name}</h3>
                  <p className="text-[11px] text-slate-400 font-mono truncate mt-0.5">{org.slug}</p>
                  {org.city && (
                    <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-3">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a2 2 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      {org.city}
                    </div>
                  )}
                  <div className="grid grid-cols-3 gap-2 mt-4 py-3 border-y border-slate-100">
                    <div className="text-center">
                      <p className="text-lg font-black text-slate-900">{org._count?.users || 0}</p>
                      <p className="text-[9px] text-slate-400 uppercase font-bold tracking-wider">Users</p>
                    </div>
                    <div className="text-center border-x border-slate-100">
                      <p className="text-lg font-black text-slate-900">{org._count?.partners || 0}</p>
                      <p className="text-[9px] text-slate-400 uppercase font-bold tracking-wider">Clients</p>
                    </div>
                    <div className="text-center">
                      <p className="text-lg font-black text-slate-900 tabular-nums">
                        {abo.mrr > 0 ? `${Math.round(abo.mrr / 1000)}k` : '—'}
                      </p>
                      <p className="text-[9px] text-slate-400 uppercase font-bold tracking-wider">MRR</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between mt-4">
                    <span className={`inline-flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-1 rounded-full ${sm.bg} ${sm.text}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${sm.dot}`}></span>
                      {sm.label}
                    </span>
                    <span className="inline-flex items-center gap-1.5 text-[10px] font-bold" style={{ color: abm.color }}>
                      <span className="w-1.5 h-1.5 rounded-full" style={{ background: abm.color }}></span>
                      {abm.label}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between flex-wrap gap-3 py-2 bg-white rounded-2xl border border-slate-200 px-4">
          <div className="text-xs text-slate-500">
            Page <span className="font-bold text-slate-900">{currentPage}</span> sur <span className="font-bold text-slate-900">{totalPages}</span>
            {' · '}{filtered.length} résultat{filtered.length > 1 ? 's' : ''}
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className="px-3 h-9 rounded-lg bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed font-bold text-sm transition"
            >
              ← Précédent
            </button>
            <span className="px-3 text-sm font-bold text-slate-700">{currentPage} / {totalPages}</span>
            <button
              onClick={() => setPage(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
              className="px-3 h-9 rounded-lg bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed font-bold text-sm transition"
            >
              Suivant →
            </button>
          </div>
        </div>
      )}

      {/* Légende MRR vs Pipeline */}
      {kpis.totalPipeline > 0 && (
        <div className="text-[10px] text-slate-400 text-right -mt-2 px-2">
          <span className="text-emerald-600 font-bold">MRR</span> = abonnement actif ·{' '}
          <span className="text-amber-600 font-bold">*</span> = pipeline (essai, non compté dans le MRR)
        </div>
      )}

      {/* Modal create/edit */}
      <OrganizationWizard
        open={showWizard}
        onClose={() => setShowWizard(false)}
        onSuccess={handleWizardSuccess}
      />

      {/* Modal édition uniquement */}
      <Modal
        open={showModal && !!editing}
        onClose={() => { setShowModal(false); resetForm(); }}
        title={'Modifier l\'organisation'}
        subtitle={editing?.name || ''}
        icon={<span className="text-2xl font-bold">✎</span>}
        footer={
          <div className="flex gap-3">
            <Button variant="secondary" onClick={() => { setShowModal(false); resetForm(); }}>Annuler</Button>
            <button
              type="submit"
              form="org-edit-form"
              disabled={saving}
              className="flex-1 bg-linear-to-r from-blue-600 to-teal-500 text-white py-2.5 rounded-xl font-semibold hover:shadow-lg transition disabled:opacity-50"
            >
              {saving ? 'Enregistrement...' : 'Enregistrer'}
            </button>
          </div>
        }
      >
        <form id="org-edit-form" onSubmit={save} className="space-y-6">
          {error && <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">{error}</div>}
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Nom" required>
              <Input type="text" value={name} onChange={e => setName(e.target.value)} required />
            </FormField>
            <FormField label="Slug" required hint="Identifiant unique">
              <Input type="text" value={slug} onChange={e => setSlug(e.target.value)} className="font-mono" required />
            </FormField>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Type">
              <Select value={type} onChange={e => setType(e.target.value)}>
                {ORG_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </Select>
            </FormField>
            <FormField label="Ville">
              <Input type="text" value={city} onChange={e => setCity(e.target.value)} />
            </FormField>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Email">
              <Input type="email" value={email} onChange={e => setEmail(e.target.value)} />
            </FormField>
            <FormField label="Téléphone">
              <Input type="text" value={phone} onChange={e => setPhone(e.target.value)} />
            </FormField>
          </div>
          <FormField label="Description">
            <Textarea value={description} onChange={e => setDescription(e.target.value)} rows={3} />
          </FormField>
        </form>
      </Modal>

      {/* Modal Suspend */}
      <Modal
        open={!!suspendModal}
        onClose={() => { setSuspendModal(null); setSuspendReason(''); setSuspendError(null); }}
        title="Suspendre l'organisation"
        subtitle={suspendModal?.name || ''}
        icon={<span className="text-2xl">⚠️</span>}
        size="md"
        footer={
          <div className="flex gap-3">
            <Button variant="secondary" onClick={() => { setSuspendModal(null); setSuspendReason(''); setSuspendError(null); }}>
              Annuler
            </Button>
            <button
              type="submit"
              form="suspend-form"
              disabled={suspending || suspendReason.trim().length < 5}
              className="flex-1 bg-gradient-to-r from-amber-500 to-red-500 text-white py-2.5 rounded-xl font-bold transition disabled:opacity-50"
            >
              {suspending ? 'Suspension...' : 'Suspendre l\'organisation'}
            </button>
          </div>
        }
      >
        <form id="suspend-form" onSubmit={confirmSuspend} className="space-y-4">
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800">
            <strong>⚠️ Conséquences immédiates :</strong>
            <ul className="list-disc ml-5 mt-2 space-y-1">
              <li>Les utilisateurs ne pourront plus se connecter</li>
              <li>Ils verront le motif ci-dessous à la tentative de connexion</li>
              <li>Les données restent intactes</li>
            </ul>
          </div>

          {suspendError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
              {suspendError}
            </div>
          )}

          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">
              Motif de suspension <span className="text-red-500">*</span>
            </label>
            <textarea
              value={suspendReason}
              onChange={(e) => setSuspendReason(e.target.value)}
              rows={4}
              placeholder="Ex : Facture impayée — 3 mois de retard (150 000 Ar)"
              minLength={5}
              maxLength={500}
              required
              className="w-full px-4 py-3 bg-white border-2 border-slate-300 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:ring-2 focus:ring-amber-400 focus:border-amber-400 transition resize-none"
            />
            <p className="text-xs text-slate-400 mt-1">
              {suspendReason.length} / 500 caractères
            </p>
          </div>
        </form>
      </Modal>

      {/* Modal Réactiver */}
      <Modal
        open={!!reactivateModal}
        onClose={() => setReactivateModal(null)}
        title="Réactiver l'organisation"
        subtitle={reactivateModal?.name || ''}
        icon={<span className="text-2xl">✅</span>}
        size="sm"
        footer={
          <div className="flex gap-3">
            <Button variant="secondary" onClick={() => setReactivateModal(null)}>
              Annuler
            </Button>
            <button
              type="button"
              onClick={confirmReactivate}
              disabled={reactivating}
              className="flex-1 bg-gradient-to-r from-emerald-600 to-teal-500 text-white py-2.5 rounded-xl font-bold transition disabled:opacity-50"
            >
              {reactivating ? 'Réactivation...' : '✓ Réactiver'}
            </button>
          </div>
        }
      >
        <div className="space-y-4">
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
            <p className="text-sm text-emerald-800 leading-relaxed">
              L&apos;organisation <strong>{reactivateModal?.name}</strong> sera de nouveau accessible.
              Les utilisateurs pourront se connecter normalement.
            </p>
          </div>
          <div className="bg-slate-50 rounded-xl p-3 border border-slate-200 text-xs text-slate-600 flex items-start gap-2">
            <span className="text-base">💡</span>
            <p>Le motif de suspension précédent sera effacé. Vous pourrez suspendre à nouveau avec un nouveau motif à tout moment.</p>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!orgToDelete}
        title="Supprimer l'organisation"
        message={`Voulez-vous vraiment supprimer "${orgToDelete?.name}" ? Toutes les données seront perdues.`}
        onClose={() => setOrgToDelete(null)}
        onConfirm={confirmDelete}
        isLoading={isDeleting}
      />
    </div>
  );
}

// ═════════════════════════════════════════════════════════════
//  Composant Th : header de colonne triable
// ═════════════════════════════════════════════════════════════

function Th({
  children, sortKey, current, dir, onSort, align = 'left',
}: {
  children: React.ReactNode;
  sortKey: SortKey;
  current: SortKey;
  dir: SortDir;
  onSort: (k: SortKey) => void;
  align?: 'left' | 'right';
}) {
  const active = current === sortKey;
  return (
    <th
      className={'p-3 text-[10px] font-black text-slate-500 uppercase tracking-wider cursor-pointer select-none hover:text-slate-800 transition ' + (align === 'right' ? 'text-right' : 'text-left')}
      onClick={() => onSort(sortKey)}
    >
      <span className="inline-flex items-center gap-1">
        {children}
        {active && (
          <svg className={'w-3 h-3 ' + (dir === 'asc' ? 'rotate-180' : '')} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
          </svg>
        )}
      </span>
    </th>
  );
}
