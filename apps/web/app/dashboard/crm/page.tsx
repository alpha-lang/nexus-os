'use client';

import { useState, useEffect } from 'react';
import { apiFetch } from '../../../lib/api';

export default function CrmOverviewPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : '';

  useEffect(() => {
    apiFetch('/api/crm/overview', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-10 w-10 border-4 border-teal-400 border-t-transparent"></div>
      </div>
    );
  }

  const k = data?.kpis || {};

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <p className="text-xs font-black text-teal-600 uppercase tracking-widest mb-1">Relation client</p>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">CRM · Vue d'ensemble</h1>
          <p className="text-slate-500 mt-1">
            Cockpit de votre portefeuille clients et fournisseurs
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <a href="/dashboard/crm/interactions" className="px-4 py-2.5 bg-white border-2 border-slate-300 rounded-xl text-sm font-semibold text-slate-700 hover:bg-slate-100 transition">
            Interactions
          </a>
          <a href="/dashboard/crm/partners?new=1" className="px-5 py-2.5 bg-linear-to-r from-blue-600 to-teal-500 text-white rounded-xl text-sm font-bold shadow-md hover:shadow-lg transition">
            + Nouveau partenaire
          </a>
        </div>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <a href="/dashboard/crm/partners" className="bg-slate-900 rounded-2xl p-5 text-white hover:shadow-lg transition">
          <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest mb-1">Partenaires</p>
          <p className="text-3xl font-black tabular-nums text-teal-400">{k.totalPartners || 0}</p>
          <p className="text-[10px] text-slate-500 mt-1">+{k.newThisMonth || 0} ce mois</p>
        </a>
        <a href="/dashboard/crm/partners?type=CUSTOMER" className="bg-white rounded-2xl p-5 border-2 border-emerald-200 hover:shadow-lg transition">
          <p className="text-[10px] text-emerald-700 uppercase font-black tracking-widest mb-1">Clients</p>
          <p className="text-3xl font-black text-emerald-600 tabular-nums">{k.clients || 0}</p>
          <p className="text-[10px] text-slate-400 mt-1">particuliers + entreprises</p>
        </a>
        <a href="/dashboard/crm/partners?type=SUPPLIER" className="bg-white rounded-2xl p-5 border-2 border-cyan-200 hover:shadow-lg transition">
          <p className="text-[10px] text-cyan-700 uppercase font-black tracking-widest mb-1">Fournisseurs</p>
          <p className="text-3xl font-black text-cyan-600 tabular-nums">{k.suppliers || 0}</p>
          <p className="text-[10px] text-slate-400 mt-1">+{k.both || 0} mixtes</p>
        </a>
        <div className="bg-white rounded-2xl p-5 border-2 border-purple-200">
          <p className="text-[10px] text-purple-700 uppercase font-black tracking-widest mb-1">Interactions</p>
          <p className="text-3xl font-black text-purple-600 tabular-nums">{k.totalInteractions || 0}</p>
          <p className="text-[10px] text-slate-400 mt-1">{k.totalNotes || 0} notes · {k.totalDocuments || 0} docs</p>
        </div>
      </div>

      {/* Grid 2 colonnes */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Top clients */}
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
            <h3 className="font-black text-slate-900 text-sm">🏆 Top 5 clients par CA</h3>
            <a href="/dashboard/crm/analytics" className="text-[10px] font-black text-teal-600 hover:underline tracking-wider">
              ANALYTICS →
            </a>
          </div>
          <div className="divide-y divide-slate-100">
            {(data?.topClients || []).map((c: any, i: number) => (
              <a key={c.id} href={`/dashboard/crm/partners/${c.id}`} className="flex items-center gap-3 px-5 py-3 hover:bg-slate-50 transition">
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center font-black text-xs shrink-0 ${
                  i === 0 ? 'bg-amber-400 text-white' :
                  i === 1 ? 'bg-slate-300 text-slate-800' :
                  i === 2 ? 'bg-orange-300 text-orange-900' :
                  'bg-slate-100 text-slate-500'
                }`}>
                  {i + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-slate-900 text-sm truncate">{c.name}</p>
                  <p className="text-[10px] text-slate-500">
                    {c.city || '—'} · {c.reservationsCount} réservation{c.reservationsCount > 1 ? 's' : ''}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="font-black text-slate-900 text-sm tabular-nums">{c.totalSpent.toLocaleString('fr-FR')}</p>
                  <p className="text-[9px] text-slate-400">Ar</p>
                </div>
              </a>
            ))}
            {(data?.topClients || []).length === 0 && (
              <p className="p-6 text-center text-xs text-slate-400">Aucun client avec réservation</p>
            )}
          </div>
        </div>

        {/* Interactions récentes */}
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
            <h3 className="font-black text-slate-900 text-sm">🎯 Interactions récentes</h3>
            <a href="/dashboard/crm/interactions" className="text-[10px] font-black text-teal-600 hover:underline tracking-wider">
              VOIR TOUT →
            </a>
          </div>
          <div className="divide-y divide-slate-100">
            {(data?.recentInteractions || []).map((it: any) => (
              <div key={it.id} className="px-5 py-3">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-[9px] font-black tracking-widest px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
                    {it.type.toUpperCase()}
                  </span>
                  <span className="font-bold text-slate-900 text-xs truncate">{it.subject}</span>
                </div>
                <p className="text-[10px] text-slate-500 truncate">
                  {it.partner?.name} · par {it.user?.name || it.user?.email || '—'} · {new Date(it.createdAt).toLocaleDateString('fr-FR')}
                </p>
              </div>
            ))}
            {(data?.recentInteractions || []).length === 0 && (
              <p className="p-6 text-center text-xs text-slate-400">Aucune interaction enregistrée</p>
            )}
          </div>
        </div>

        {/* Derniers partenaires */}
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden lg:col-span-2">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
            <h3 className="font-black text-slate-900 text-sm">🆕 Derniers partenaires ajoutés</h3>
            <a href="/dashboard/crm/partners" className="text-[10px] font-black text-teal-600 hover:underline tracking-wider">
              VOIR TOUT →
            </a>
          </div>
          <div className="divide-y divide-slate-100">
            {(data?.recentPartners || []).map((p: any) => {
              const meta: any = {
                CUSTOMER: { bg: 'bg-emerald-100', text: 'text-emerald-700', icon: '👤', label: 'Client' },
                SUPPLIER: { bg: 'bg-cyan-100', text: 'text-cyan-700', icon: '🚚', label: 'Fournisseur' },
                BOTH: { bg: 'bg-purple-100', text: 'text-purple-700', icon: '🤝', label: 'Les deux' },
              };
              const m = meta[p.type] || meta.CUSTOMER;
              return (
                <a key={p.id} href={`/dashboard/crm/partners/${p.id}`} className="flex items-center gap-3 px-5 py-3 hover:bg-slate-50 transition">
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-slate-600 to-slate-800 flex items-center justify-center text-white font-black text-xs shrink-0">
                    {p.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <p className="font-bold text-slate-900 text-sm truncate">{p.name}</p>
                      <span className={`text-[9px] font-black tracking-widest px-1.5 py-0.5 rounded ${m.bg} ${m.text}`}>
                        {m.label.toUpperCase()}
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-500 truncate">
                      {p.city || '—'} {p.email ? `· ${p.email}` : ''}
                    </p>
                  </div>
                  <span className="text-[10px] text-slate-400 shrink-0">
                    {new Date(p.createdAt).toLocaleDateString('fr-FR')}
                  </span>
                </a>
              );
            })}
            {(data?.recentPartners || []).length === 0 && (
              <p className="p-6 text-center text-xs text-slate-400">Aucun partenaire encore</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
