'use client';

import { useState, useEffect, useMemo } from 'react';
import { apiFetch } from '../../../lib/api';
import { Modal, Button, FormField, Input, Select } from '../../../components/ui';
import { usePagination } from '../../../lib/usePagination';
import { resolvePrice } from '../../../lib/pricing';
import { Pagination } from '../../../lib/Pagination';

const STATUS_FLOW = ['TRIAL', 'ACTIVE', 'SUSPENDED', 'EXPIRED'] as const;

const STATUS_META: Record<string, { label: string; color: string; bg: string; border: string; step: number }> = {
  TRIAL:     { label: 'Essai',      color: '#3b82f6', bg: 'bg-blue-50',    border: 'border-blue-300',    step: 1 },
  ACTIVE:    { label: 'Actif',      color: '#10b981', bg: 'bg-emerald-50', border: 'border-emerald-300', step: 2 },
  SUSPENDED: { label: 'Suspendu',   color: '#f59e0b', bg: 'bg-amber-50',   border: 'border-amber-300',   step: 3 },
  EXPIRED:   { label: 'Expire',     color: '#dc2626', bg: 'bg-red-50',     border: 'border-red-300',     step: 4 },
};

function daysBetween(a: Date, b: Date) {
  return Math.max(0, Math.ceil((b.getTime() - a.getTime()) / 86400000));
}
function fmtDate(d: string | Date | null | undefined) {
  if (!d) return '-';
  return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
}

function TimelineBar({ start, end, status }: { start: string; end: string | null; status: string }) {
  const meta = STATUS_META[status] || STATUS_META.TRIAL;
  const now = Date.now();
  const startMs = new Date(start).getTime();
  const endMs = end ? new Date(end).getTime() : now + 30 * 86400000;
  const total = endMs - startMs;
  const elapsed = Math.min(now - startMs, total);
  const pct = total > 0 ? Math.max(0, Math.min(100, (elapsed / total) * 100)) : 0;
  const daysTotal = Math.round(total / 86400000);
  const daysLeft = end ? Math.max(0, Math.ceil((endMs - now) / 86400000)) : null;

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-[10px] font-black tracking-widest">
        <span className="text-slate-500">{fmtDate(start)}</span>
        <span style={{ color: meta.color }}>
          {daysLeft !== null ? `${daysLeft}j restants` : 'Sans terme'}
        </span>
        <span className="text-slate-500">{end ? fmtDate(end) : '∞'}</span>
      </div>
      <div className="relative h-2 bg-slate-100 rounded-full overflow-hidden">
        <div
          className="absolute left-0 top-0 h-full rounded-full transition-all"
          style={{ width: `${pct}%`, background: meta.color }}
        />
        <div
          className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-white shadow border-2"
          style={{ left: `calc(${pct}% - 6px)`, borderColor: meta.color }}
        />
      </div>
      <p className="text-[10px] text-slate-400">{daysTotal} jours total</p>
    </div>
  );
}

function StatusStepper({ current }: { current: string }) {
  const meta = STATUS_META[current] || STATUS_META.TRIAL;
  return (
    <div className="flex items-center gap-1">
      {STATUS_FLOW.map((s, i) => {
        const step = STATUS_META[s].step;
        const reached = step <= meta.step;
        return (
          <div key={s} className="flex items-center gap-1">
            <div
              className={`w-2 h-2 rounded-full transition ${reached ? '' : 'bg-slate-200'}`}
              style={reached ? { background: STATUS_META[s].color } : {}}
              title={STATUS_META[s].label}
            />
            {i < STATUS_FLOW.length - 1 && (
              <div className={`w-4 h-0.5 ${reached && step < meta.step ? 'bg-slate-300' : reached ? '' : 'bg-slate-200'}`}
                style={reached && step === meta.step ? { background: meta.color } : {}} />
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function SubscriptionsPage() {
  const [subscriptions, setSubscriptions] = useState<any[]>([]);
  const [availableOrganizations, setAvailableOrganizations] = useState<any[]>([]);
  const [modules, setModules] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [manageModal, setManageModal] = useState<any>(null); // subscription en cours de gestion
  const [allModules, setAllModules] = useState<any[]>([]);
  const [managing, setManaging] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [sort, setSort] = useState<'recent' | 'name' | 'mrr'>('recent');

  const [organizationId, setOrganizationId] = useState('');
  const [billingPeriod, setBillingPeriod] = useState('MONTHLY');
  const [status, setStatus] = useState('TRIAL');
  const [endDate, setEndDate] = useState('');
  const [selectedModules, setSelectedModules] = useState<string[]>([]);
  const [maxStorage, setMaxStorage] = useState('500');
  const [quotaPrice, setQuotaPrice] = useState('');

  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : '';

  async function load() {
    const res = await apiFetch('/api/subscriptions', { headers: { Authorization: `Bearer ${token}` } });
    const data = await res.json();
    setSubscriptions(Array.isArray(data) ? data : []);
  }

  useEffect(() => { load().catch(console.error).finally(() => setLoading(false)); }, []);
  // reset pagination gerer par le hook

  function showToast(msg: string) { setToast(msg); setTimeout(() => setToast(null), 3000); }

  async function loadAvailableOrganizations() {
    const res = await apiFetch('/api/subscriptions/available-organizations', { headers: { Authorization: `Bearer ${token}` } });
    const data = await res.json();
    setAvailableOrganizations(Array.isArray(data) ? data : []);
  }

  async function loadModulesForType(type: string) {
    const res = await apiFetch(`/api/modules?type=${type}`, { headers: { Authorization: `Bearer ${token}` } });
    const data = await res.json();
    setModules(Array.isArray(data) ? data : []);
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setError(null); setSaving(true);
    const res = await apiFetch('/api/subscriptions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        organizationId, billingPeriod, status, endDate,
        moduleIds: selectedModules,
        maxStorage: parseFloat(maxStorage),
        quotaPrice: parseFloat(quotaPrice),
      }),
    });
    setSaving(false);
    if (res.ok) {
      showToast('Abonnement cree');
      setShowModal(false);
      setOrganizationId(''); setBillingPeriod('MONTHLY'); setStatus('TRIAL');
      setEndDate(''); setSelectedModules([]); setMaxStorage('500'); setQuotaPrice('');
      await load();
    } else {
      const data = await res.json();
      setError(data.message || 'Erreur');
    }
  }

  async function changeStatus(id: string, action: string) {
    await apiFetch(`/api/subscriptions/${id}/${action}`, { method: 'PATCH', headers: { Authorization: `Bearer ${token}` } });
    showToast('Statut mis a jour');
    await load();
  }

  async function toggleModule(subId: string, modId: string, isActive: boolean) {
    const action = isActive ? 'deactivate-module' : 'activate-module';
    await apiFetch(`/api/subscriptions/${subId}/${action}/${modId}`, { method: 'PATCH', headers: { Authorization: `Bearer ${token}` } });
    await load();
  }

  function toggleModuleSelection(id: string) {
    setSelectedModules(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  }

  const totalModulesPrice = selectedModules.reduce((s, id) => s + (modules.find(m => m.id === id)?.price || 0), 0);
  const totalSelected = totalModulesPrice + (parseFloat(quotaPrice) || 0);

  function computePrice(sub: any): number {
    if (sub.status !== 'ACTIVE') return 0;
    const orgType = sub.organization?.type;
    return (sub.activeModules || [])
      .filter((am: any) => am.isActive)
      .reduce((s: number, am: any) => s + resolvePrice(am.module, orgType), 0);
  }

  const kpis = useMemo(() => {
    const total = subscriptions.length;
    const active = subscriptions.filter(s => s.status === 'ACTIVE').length;
    const trial = subscriptions.filter(s => s.status === 'TRIAL').length;
    const mrr = subscriptions.reduce((sum, s) => sum + computePrice(s), 0);
    return { total, active, trial, mrr };
  }, [subscriptions]);

  const filtered = useMemo(() => {
    let list = [...subscriptions];
    if (statusFilter !== 'ALL') list = list.filter(s => s.status === statusFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(s => s.organization?.name?.toLowerCase().includes(q));
    }
    list.sort((a, b) => {
      if (sort === 'name') return (a.organization?.name || '').localeCompare(b.organization?.name || '');
      if (sort === 'mrr') return computePrice(b) - computePrice(a);
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
    return list;
  }, [subscriptions, statusFilter, search, sort]);

  const pag = usePagination(filtered, { perPageDefault: 6 });

  async function openManage(sub: any) {
    // Récupère tous les modules du catalogue
    const res = await apiFetch('/api/modules', { headers: { Authorization: `Bearer ${token}` } });
    const data = await res.json();
    const mods = Array.isArray(data) ? data : (data.items || []);
    setAllModules(mods);
    setManageModal(sub);
  }

  async function toggleModuleForSub(subId: string, modId: string, currentlyActive: boolean) {
    setManaging(true);
    const action = currentlyActive ? 'deactivate-module' : 'activate-module';
    await apiFetch(`/api/subscriptions/${subId}/${action}/${modId}`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}` },
    });
    setManaging(false);
    // Recharge la sub
    const res = await apiFetch('/api/subscriptions', { headers: { Authorization: `Bearer ${token}` } });
    const data = await res.json();
    const subs = Array.isArray(data) ? data : (data.items || []);
    const updated = subs.find((s: any) => s.id === subId);
    if (updated) setManageModal(updated);
    await load();
  }

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
          <p className="text-xs font-black text-emerald-600 uppercase tracking-widest mb-1">Contrats</p>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Abonnements</h1>
          <p className="text-slate-500 mt-1">
            {kpis.total} contrat{kpis.total > 1 ? 's' : ''} · {kpis.active} actif{kpis.active > 1 ? 's' : ''} · {kpis.trial} en essai
          </p>
        </div>
        <Button
          onClick={() => { loadAvailableOrganizations(); setShowModal(true); }}
          icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"/></svg>}
        >
          Nouvel abonnement
        </Button>
      </div>

      {/* Bandeau MRR */}
      <div className="bg-gradient-to-r from-emerald-600 to-teal-600 rounded-2xl p-5 text-white shadow-lg">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <p className="text-[10px] text-emerald-100 uppercase font-black tracking-widest mb-1">MRR</p>
            <p className="text-2xl font-black">{kpis.mrr.toLocaleString('fr-FR')} Ar</p>
            <p className="text-[10px] text-emerald-100 mt-0.5">revenu mensuel recurrent</p>
          </div>
          <div>
            <p className="text-[10px] text-emerald-100 uppercase font-black tracking-widest mb-1">Actifs</p>
            <p className="text-2xl font-black">{kpis.active}</p>
            <p className="text-[10px] text-emerald-100 mt-0.5">abonnements payants</p>
          </div>
          <div>
            <p className="text-[10px] text-emerald-100 uppercase font-black tracking-widest mb-1">Essais</p>
            <p className="text-2xl font-black">{kpis.trial}</p>
            <p className="text-[10px] text-emerald-100 mt-0.5">a convertir</p>
          </div>
          <div>
            <p className="text-[10px] text-emerald-100 uppercase font-black tracking-widest mb-1">Total</p>
            <p className="text-2xl font-black">{kpis.total}</p>
            <p className="text-[10px] text-emerald-100 mt-0.5">contrats geres</p>
          </div>
        </div>
      </div>

      {/* Barre recherche + filtre statut */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-3 space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
          <div className="md:col-span-2">
            <input
              type="text"
              placeholder="Rechercher une organisation..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:ring-2 focus:ring-teal-400 focus:border-teal-400 focus:bg-white transition"
            />
          </div>
          <div className="md:col-span-2 flex flex-wrap gap-1.5 items-center">
            <select
              value={sort}
              onChange={e => { setSort(e.target.value as any); pag.setPage(1); }}
              className="px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 cursor-pointer"
            >
              <option value="recent">Recents</option>
              <option value="name">Nom A-Z</option>
              <option value="mrr">MRR decroissant</option>
            </select>
            {['ALL', 'TRIAL', 'ACTIVE', 'SUSPENDED', 'EXPIRED'].map(s => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`px-3 py-2 rounded-xl text-xs font-bold transition ${
                  statusFilter === s
                    ? s === 'ALL' ? 'bg-slate-900 text-white' : 'text-white shadow-md'
                    : 'bg-white border border-slate-200 text-slate-700 hover:border-slate-400'
                }`}
                style={statusFilter === s && s !== 'ALL' ? { background: STATUS_META[s].color } : {}}
              >
                {s === 'ALL' ? 'Tous' : STATUS_META[s].label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Liste contrats style timeline */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-3xl border-2 border-dashed border-slate-200 p-16 text-center">
          <p className="text-lg font-bold text-slate-700 mb-1">Aucun abonnement</p>
          <p className="text-sm text-slate-400">Creez votre premier contrat</p>
        </div>
      ) : (
        <div className="space-y-4">
          {pag.pageItems.map(sub => {
            const sm = STATUS_META[sub.status] || STATUS_META.TRIAL;
            const price = computePrice(sub);
            const activeModules = (sub.activeModules || []).filter((am: any) => am.isActive);
            const inactiveModules = (sub.activeModules || []).filter((am: any) => !am.isActive);
            const maxStorageVal = sub.organization?.storageQuota?.maxStorage || 500;

            return (
              <div key={sub.id} className={`bg-white rounded-2xl border-2 ${sm.border} overflow-hidden`}>
                {/* Header contrat */}
                <div className="flex items-center gap-4 p-4 border-b border-slate-100">
                  <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-white font-black text-lg shrink-0 shadow-md"
                    style={{ background: sm.color }}>
                    {sub.organization?.name?.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <h3 className="font-black text-slate-900 text-base truncate">{sub.organization?.name}</h3>
                      <span className={`text-[10px] font-black tracking-widest px-2 py-0.5 rounded-md ${sm.bg}`}
                        style={{ color: sm.color }}>
                        {sm.label.toUpperCase()}
                      </span>
                      <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                        {sub.billingPeriod}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 truncate">
                      {sub.organization?.type || 'Organisation'} · Quota {maxStorageVal} Mo
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest">MRR</p>
                    <p className="text-xl font-black text-slate-900">
                      {price > 0 ? `${price.toLocaleString('fr-FR')} Ar` : 'Gratuit'}
                    </p>
                  </div>
                </div>

                {/* Timeline + Stepper */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5 p-4 bg-slate-50/50">
                  <div>
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Periode</p>
                    <TimelineBar start={sub.startDate} end={sub.endDate} status={sub.status} />
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Cycle de vie</p>
                    <div className="flex items-center gap-3">
                      <StatusStepper current={sub.status} />
                      <span className="text-xs text-slate-500 font-bold">
                        Etape {sm.step}/4
                      </span>
                    </div>
                  </div>
                </div>

                {/* Modules */}
                <div className="p-4 border-t border-slate-100">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                      Modules ({activeModules.length}/{sub.activeModules?.length || 0})
                    </p>
                    <p className="text-[10px] text-slate-400">Cliquez pour activer/desactiver</p>
                  </div>
                  {(sub.activeModules?.length || 0) === 0 ? (
                    <p className="text-xs text-slate-400 italic py-2">Aucun module attache</p>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {activeModules.map((am: any) => (
                        <button
                          key={am.id}
                          onClick={() => toggleModule(sub.id, am.moduleId, am.isActive)}
                          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 transition"
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                          {am.module?.name}
                          <span className="text-[9px] text-emerald-600">
                            {am.module?.price ? am.module.price.toLocaleString('fr-FR') : 'Gratuit'}
                          </span>
                        </button>
                      ))}
                      {inactiveModules.map((am: any) => (
                        <button
                          key={am.id}
                          onClick={() => toggleModule(sub.id, am.moduleId, am.isActive)}
                          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-100 text-slate-500 border border-slate-200 hover:bg-slate-200 transition line-through"
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
                          {am.module?.name}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Actions */}
                {/* Bandeau modules : bouton gérer */}
                <div className="px-4 pb-3">
                  <button
                    onClick={() => openManage(sub)}
                    className="w-full py-2 rounded-lg text-xs font-bold bg-slate-100 text-slate-700 hover:bg-slate-200 transition flex items-center justify-center gap-1.5"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"/>
                    </svg>
                    Rattacher / retirer des modules
                  </button>
                </div>

                <div className="flex flex-wrap items-center gap-2 p-4 border-t border-slate-100 bg-slate-50/50">
                  {(sub.status === 'TRIAL' || sub.status === 'SUSPENDED' || sub.status === 'EXPIRED') && (
                    <button
                      onClick={() => changeStatus(sub.id, 'activate')}
                      className="px-4 py-2 rounded-xl text-xs font-black bg-emerald-500 text-white hover:bg-emerald-600 shadow-md transition"
                    >
                      {sub.status === 'TRIAL' ? 'Convertir en payant' : sub.status === 'EXPIRED' ? 'Renouveler' : 'Reactiver'}
                    </button>
                  )}
                  {(sub.status === 'ACTIVE' || sub.status === 'TRIAL') && (
                    <button
                      onClick={() => changeStatus(sub.id, 'suspend')}
                      className="px-4 py-2 rounded-xl text-xs font-black bg-amber-100 text-amber-700 hover:bg-amber-200 transition"
                    >
                      Suspendre
                    </button>
                  )}
                  {(sub.status === 'ACTIVE' || sub.status === 'SUSPENDED') && (
                    <button
                      onClick={() => changeStatus(sub.id, 'expire')}
                      className="px-4 py-2 rounded-xl text-xs font-black bg-red-100 text-red-700 hover:bg-red-200 transition"
                    >
                      Expirer
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Pagination
        page={pag.page}
        totalPages={pag.totalPages}
        onPageChange={pag.setPage}
        perPage={pag.perPage}
        perPageOptions={pag.perPageOptions}
        onPerPageChange={pag.setPerPage}
        total={pag.total}
      />

      {/* Modal */}
      <Modal
        open={showModal}
        onClose={() => setShowModal(false)}
        title="Nouvel abonnement"
        subtitle="Configurez un contrat pour un tenant"
        icon={<span className="text-2xl font-bold">+</span>}
        footer={
          <div className="flex gap-3">
            <Button variant="secondary" onClick={() => setShowModal(false)}>Annuler</Button>
            <button
              type="submit"
              form="sub-form"
              disabled={saving}
              className="flex-1 bg-linear-to-r from-blue-600 to-teal-500 text-white py-2.5 rounded-xl font-semibold hover:shadow-lg transition disabled:opacity-50"
            >
              {saving ? 'Enregistrement...' : 'Creer'}
            </button>
          </div>
        }
      >
        <form id="sub-form" onSubmit={save} className="space-y-5">
          {error && <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">{error}</div>}

          <FormField label="Organisation" required>
            <Select
              value={organizationId}
              onChange={e => {
                setOrganizationId(e.target.value);
                const org = availableOrganizations.find((o: any) => o.id === e.target.value);
                if (org) loadModulesForType(org.type);
              }}
              required
            >
              <option value="">- Choisir -</option>
              {availableOrganizations.map((o: any) => (
                <option key={o.id} value={o.id}>{o.name}</option>
              ))}
            </Select>
          </FormField>

          <div className="grid grid-cols-2 gap-4">
            <FormField label="Periode">
              <Select value={billingPeriod} onChange={e => setBillingPeriod(e.target.value)}>
                <option value="MONTHLY">Mensuel</option>
                <option value="QUARTERLY">Trimestriel</option>
                <option value="ANNUAL">Annuel</option>
              </Select>
            </FormField>
            <FormField label="Statut">
              <Select value={status} onChange={e => setStatus(e.target.value)}>
                <option value="TRIAL">Essai (gratuit)</option>
                <option value="ACTIVE">Actif (facture)</option>
                <option value="SUSPENDED">Suspendu</option>
                <option value="EXPIRED">Expire</option>
              </Select>
            </FormField>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <FormField label="Quota max (Mo)">
              <Input type="number" value={maxStorage} onChange={e => setMaxStorage(e.target.value)} />
            </FormField>
            <FormField label="Prix du quota (Ar)">
              <Input type="number" value={quotaPrice} onChange={e => setQuotaPrice(e.target.value)} placeholder="10000" />
            </FormField>
          </div>

          <FormField label="Date de fin">
            <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
          </FormField>

          <FormField label="Modules">
            <div className="border border-gray-200 rounded-xl p-3 space-y-2 max-h-48 overflow-y-auto">
              {modules.map((m: any) => (
                <label key={m.id} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedModules.includes(m.id)}
                    onChange={() => toggleModuleSelection(m.id)}
                    className="w-4 h-4 text-teal-600 rounded focus:ring-teal-500"
                  />
                  <span className="text-sm text-slate-700 flex-1">{m.name}</span>
                  <span className="text-xs text-slate-500 font-bold">
                    {m.price ? `${m.price.toLocaleString('fr-FR')} Ar` : 'Gratuit'}
                  </span>
                </label>
              ))}
              {modules.length === 0 && (
                <p className="text-sm text-slate-400 text-center py-2">Selectionnez d abord une organisation</p>
              )}
            </div>
          </FormField>

          <div className="bg-slate-50 rounded-xl p-4 flex items-center justify-between">
            <span className="text-xs font-black text-slate-500 uppercase tracking-widest">Total mensuel</span>
            <span className="text-2xl font-black text-slate-900">{totalSelected.toLocaleString('fr-FR')} Ar</span>
          </div>
        </form>
      </Modal>

      {/* ═══════════════════════════════════════════════
          MODALE : GÉRER LES MODULES D'UN ABONNEMENT
          ═══════════════════════════════════════════════ */}
      {manageModal && (
        <Modal
          open={!!manageModal}
          onClose={() => setManageModal(null)}
          title={'Modules de ' + (manageModal.organization?.name || '')}
          subtitle="Cochez pour rattacher, décochez pour retirer"
          icon={<span className="text-2xl">🧩</span>}
          size="lg"
          footer={
            <div className="flex justify-end">
              <Button variant="secondary" onClick={() => setManageModal(null)}>Fermer</Button>
            </div>
          }
        >
          <div className="space-y-2">
            {allModules.length === 0 ? (
              <p className="text-center text-slate-400 py-8 text-sm">Aucun module au catalogue</p>
            ) : (
              allModules.map((m) => {
                const current = manageModal.activeModules?.find((am: any) => am.moduleId === m.id);
                const isActive = current?.isActive === true;
                const hasLink = !!current;

                return (
                  <button
                    key={m.id}
                    type="button"
                    disabled={managing}
                    onClick={() => toggleModuleForSub(manageModal.id, m.id, isActive)}
                    className={
                      'w-full flex items-center gap-3 p-3 rounded-xl border-2 transition text-left disabled:opacity-50 ' +
                      (isActive
                        ? 'border-emerald-400 bg-emerald-50 hover:bg-emerald-100'
                        : hasLink
                        ? 'border-slate-300 bg-slate-50 hover:bg-slate-100'
                        : 'border-slate-200 bg-white hover:border-teal-400 hover:bg-teal-50')
                    }
                  >
                    <div className={'w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ' + (isActive ? 'bg-emerald-500 text-white' : 'bg-slate-200 text-slate-500')}>
                      {isActive ? (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"/>
                        </svg>
                      ) : (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"/>
                        </svg>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="font-bold text-slate-900 text-sm">{m.name}</span>
                        {!hasLink && (
                          <span className="text-[9px] font-black tracking-widest px-1.5 py-0.5 rounded bg-cyan-100 text-cyan-700">
                            NOUVEAU
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-slate-400 font-mono truncate">{m.route || '-'}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="font-black text-slate-900 text-sm tabular-nums">
                        {m.price > 0 ? m.price.toLocaleString('fr-FR') : 'Gratuit'}
                      </p>
                      {m.price > 0 && <p className="text-[9px] text-slate-400">Ar / mois</p>}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}
