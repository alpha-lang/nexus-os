'use client';

import { useState, useEffect, useMemo } from 'react';
import { apiFetch } from '../../../../lib/api';

type SortId = 'name' | 'purchases' | 'orders' | 'articles' | 'recent';
type FilterId = 'ALL' | 'ALERTS' | 'PENDING' | 'ACTIVE';

export default function SuppliersStockViewPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<FilterId>('ALL');
  const [sort, setSort] = useState<SortId>('purchases');

  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : '';

  async function load() {
    const res = await apiFetch('/api/stock/suppliers/stats', {
      headers: { Authorization: `Bearer ${token}` },
    });
    const json = await res.json();
    setData(json);
  }

  useEffect(() => {
    load().catch(console.error).finally(() => setLoading(false));
  }, []);

  const suppliers = data?.suppliers || [];
  const summary = data?.summary || {};

  const filtered = useMemo(() => {
    let list = [...suppliers];

    // Filtres
    if (filter === 'ALERTS') list = list.filter((s: any) => s.articlesCritical + s.articlesOut > 0);
    else if (filter === 'PENDING') list = list.filter((s: any) => s.pendingOrders > 0);
    else if (filter === 'ACTIVE') list = list.filter((s: any) => s.totalOrders > 0);

    // Recherche
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((s: any) =>
        s.name?.toLowerCase().includes(q) ||
        s.contactName?.toLowerCase().includes(q) ||
        s.email?.toLowerCase().includes(q) ||
        s.phone?.toLowerCase().includes(q) ||
        s.city?.toLowerCase().includes(q)
      );
    }

    // Tri
    list.sort((a: any, b: any) => {
      if (sort === 'name') return (a.name || '').localeCompare(b.name || '');
      if (sort === 'purchases') return b.totalPurchases - a.totalPurchases;
      if (sort === 'orders') return b.totalOrders - a.totalOrders;
      if (sort === 'articles') return b.articlesCount - a.articlesCount;
      // recent
      const da = a.lastOrderAt ? new Date(a.lastOrderAt).getTime() : 0;
      const db = b.lastOrderAt ? new Date(b.lastOrderAt).getTime() : 0;
      return db - da;
    });

    return list;
  }, [suppliers, filter, search, sort]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-10 w-10 border-4 border-teal-400 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="space-y-5 max-w-7xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <p className="text-xs font-black text-teal-600 uppercase tracking-widest mb-1">Approvisionnement</p>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Fournisseurs</h1>
          <p className="text-slate-500 mt-1">
            Vue stock-centrée · {summary.totalSuppliers || 0} fournisseur{(summary.totalSuppliers || 0) > 1 ? 's' : ''} ·{' '}
            <span className="font-bold text-slate-900">{(summary.totalPurchases || 0).toLocaleString('fr-FR')} Ar</span> d'achats cumulés
          </p>
        </div>
        <div className="flex gap-2 flex-wrap shrink-0">
          <a
            href="/dashboard/crm"
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-white border-2 border-slate-300 rounded-xl text-sm font-semibold text-slate-700 hover:bg-slate-100 transition"
            title="Vue CRM complète (interactions, documents, tags)"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            Vue CRM
          </a>
          <a
            href="/dashboard/crm?new=SUPPLIER"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-linear-to-r from-blue-600 to-teal-500 text-white rounded-xl text-sm font-bold shadow-md hover:shadow-lg transition"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"/>
            </svg>
            Nouveau fournisseur
          </a>
        </div>
      </div>

      {/* KPI summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-slate-900 rounded-2xl p-5 text-white">
          <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest mb-1">Fournisseurs</p>
          <p className="text-2xl font-black tabular-nums text-teal-400">{summary.totalSuppliers || 0}</p>
          <p className="text-[10px] text-slate-500 mt-0.5">partenaires actifs</p>
        </div>
        <div className="bg-white rounded-2xl p-5 border border-slate-200">
          <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest mb-1">Articles fournis</p>
          <p className="text-2xl font-black text-slate-900 tabular-nums">{summary.totalArticles || 0}</p>
          <p className="text-[10px] text-slate-400 mt-0.5">références liées</p>
        </div>
        <div className="bg-white rounded-2xl p-5 border border-slate-200">
          <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest mb-1">Commandes en cours</p>
          <p className="text-2xl font-black text-cyan-600 tabular-nums">{summary.totalPendingOrders || 0}</p>
          <p className="text-[10px] text-slate-400 mt-0.5">brouillon / envoyée / partielle</p>
        </div>
        <div className={`rounded-2xl p-5 border ${(summary.suppliersWithAlerts || 0) > 0 ? 'bg-red-50 border-red-200' : 'bg-emerald-50 border-emerald-200'}`}>
          <p className={`text-[10px] uppercase font-black tracking-widest mb-1 ${(summary.suppliersWithAlerts || 0) > 0 ? 'text-red-700' : 'text-emerald-700'}`}>
            Alertes stock
          </p>
          <p className={`text-2xl font-black tabular-nums ${(summary.suppliersWithAlerts || 0) > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
            {summary.suppliersWithAlerts || 0}
          </p>
          <p className={`text-[10px] mt-0.5 ${(summary.suppliersWithAlerts || 0) > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
            fournisseurs avec ruptures
          </p>
        </div>
      </div>

      {/* Toolbar */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-3 space-y-3">
        <div className="relative">
          <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
            </svg>
          </span>
          <input
            type="text"
            placeholder="Rechercher par nom, contact, email, ville…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:ring-2 focus:ring-teal-400 focus:border-teal-400 focus:bg-white transition"
          />
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {([
            { v: 'ALL' as const, l: 'Tous' },
            { v: 'ALERTS' as const, l: 'Avec alertes' },
            { v: 'PENDING' as const, l: 'Commandes en cours' },
            { v: 'ACTIVE' as const, l: 'Avec commandes' },
          ]).map((f) => (
            <button
              key={f.v}
              onClick={() => setFilter(f.v)}
              className={
                'px-3 py-1.5 rounded-lg text-xs font-bold transition ' +
                (filter === f.v ? 'bg-slate-900 text-white shadow' : 'bg-white border border-slate-200 text-slate-600 hover:border-slate-400')
              }
            >
              {f.l}
            </button>
          ))}

          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as SortId)}
            className="ml-auto px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-700 cursor-pointer"
          >
            <option value="purchases">Achats ↓</option>
            <option value="orders">Commandes ↓</option>
            <option value="articles">Articles ↓</option>
            <option value="recent">Dernière cmd</option>
            <option value="name">Nom A-Z</option>
          </select>

          <span className="text-xs text-slate-500 font-bold ml-2">
            {filtered.length} résultat{filtered.length > 1 ? 's' : ''}
          </span>
        </div>
      </div>

      {/* Liste */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border-2 border-dashed border-slate-200 p-16 text-center">
          <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center text-3xl mx-auto mb-3">🚚</div>
          <p className="text-lg font-bold text-slate-700 mb-1">
            {search || filter !== 'ALL' ? 'Aucun fournisseur trouvé' : 'Aucun fournisseur'}
          </p>
          <p className="text-sm text-slate-400 mb-4">
            {search || filter !== 'ALL' ? 'Modifiez vos filtres' : 'Créez votre premier fournisseur'}
          </p>
          {!search && filter === 'ALL' && (
            <a
              href="/dashboard/crm?new=SUPPLIER"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-linear-to-r from-blue-600 to-teal-500 text-white rounded-xl font-bold hover:shadow-lg transition"
            >
              + Nouveau fournisseur
            </a>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((s: any) => {
            const hasAlerts = s.articlesCritical + s.articlesOut > 0;
            const hasPending = s.pendingOrders > 0;
            const initials = (s.name || '?').slice(0, 2).toUpperCase();

            return (
              <a
                key={s.id}
                href={`/dashboard/crm/${s.id}`}
                className="group block bg-white rounded-2xl border-2 border-slate-200 hover:border-teal-400 hover:shadow-lg transition overflow-hidden"
              >
                <div className="flex items-center gap-4 p-4">
                  {/* Avatar */}
                  <div className={
                    'w-14 h-14 rounded-2xl flex items-center justify-center text-white font-black text-lg shadow-md shrink-0 ' +
                    (hasAlerts
                      ? 'bg-gradient-to-br from-red-500 to-rose-600'
                      : 'bg-gradient-to-br from-slate-600 to-slate-800')
                  }>
                    {initials}
                  </div>

                  {/* Identité */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <h3 className="font-black text-slate-900 text-base truncate">{s.name}</h3>
                      {s.leadTimeDays != null && (
                        <span className="text-[10px] font-black tracking-widest px-2 py-0.5 rounded-md bg-cyan-100 text-cyan-700">
                          {s.leadTimeDays}J
                        </span>
                      )}
                      {hasAlerts && (
                        <span className="text-[10px] font-black tracking-widest px-2 py-0.5 rounded-md bg-red-100 text-red-700">
                          {s.articlesOut > 0 && `${s.articlesOut} RUPTURE${s.articlesOut > 1 ? 'S' : ''}`}
                          {s.articlesOut > 0 && s.articlesCritical > 0 && ' · '}
                          {s.articlesCritical > 0 && `${s.articlesCritical} CRITIQUE${s.articlesCritical > 1 ? 'S' : ''}`}
                        </span>
                      )}
                      {hasPending && (
                        <span className="text-[10px] font-black tracking-widest px-2 py-0.5 rounded-md bg-amber-100 text-amber-700">
                          {s.pendingOrders} CMD EN COURS
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-slate-500">
                      {s.contactName && <span>👤 {s.contactName}</span>}
                      {s.phone && <span>📞 {s.phone}</span>}
                      {s.email && <span>✉️ {s.email}</span>}
                      {s.city && <span>📍 {s.city}</span>}
                    </div>
                  </div>

                  {/* Stats rapides */}
                  <div className="hidden md:grid grid-cols-3 gap-4 shrink-0 px-4 border-l border-slate-100">
                    <div className="text-center">
                      <p className="text-[9px] text-slate-400 uppercase font-black tracking-widest">Articles</p>
                      <p className="text-lg font-black text-slate-900 tabular-nums">{s.articlesCount}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-[9px] text-slate-400 uppercase font-black tracking-widest">Commandes</p>
                      <p className="text-lg font-black text-slate-900 tabular-nums">
                        {s.totalOrders}
                        {s.pendingOrders > 0 && (
                          <span className="text-[10px] text-amber-600 ml-1">({s.pendingOrders})</span>
                        )}
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-[9px] text-slate-400 uppercase font-black tracking-widest">Achats</p>
                      <p className="text-lg font-black text-slate-900 tabular-nums">{s.totalPurchases.toLocaleString('fr-FR')}</p>
                      <p className="text-[9px] text-slate-400">Ar</p>
                    </div>
                  </div>

                  {/* Chevron */}
                  <svg
                    className="w-5 h-5 text-slate-300 group-hover:text-teal-500 transition shrink-0"
                    fill="none" stroke="currentColor" viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"/>
                  </svg>
                </div>

                {/* Footer avec dernière commande */}
                <div className="px-4 py-2 bg-slate-50/70 border-t border-slate-100 flex flex-wrap items-center gap-x-4 gap-y-1 text-[10px] text-slate-400">
                  <span>
                    {s.lastOrderAt
                      ? `Dernière commande : ${new Date(s.lastOrderAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })}`
                      : 'Aucune commande encore'}
                  </span>
                  <span className="ml-auto font-bold text-teal-600 group-hover:text-teal-700">
                    Voir la fiche CRM complète →
                  </span>
                </div>
              </a>
            );
          })}
        </div>
      )}
    </div>
  );
}
