
'use client';

import { useState, useEffect } from 'react';
import { apiFetch } from '../../../lib/api';
import RevenueChart from '../../../components/charts/RevenueChart';

// ═════════════════════════════════════════════════════════════
//  UTILS
// ═════════════════════════════════════════════════════════════

function fmtAr(n: number): string {
  return Math.round(n || 0).toLocaleString('fr-FR');
}

function fmtCompact(n: number): string {
  const v = Math.round(n || 0);
  if (v >= 1_000_000_000) return (v / 1_000_000_000).toFixed(1) + 'Md';
  if (v >= 1_000_000) return (v / 1_000_000).toFixed(1) + 'M';
  if (v >= 1_000) return (v / 1_000).toFixed(1) + 'k';
  return String(v);
}

const PLAN_COLORS: Record<string, string> = {
  Starter:    '#94a3b8',
  Standard:   '#3b82f6',
  Pro:        '#8b5cf6',
  Enterprise: '#f59e0b',
};

// ═════════════════════════════════════════════════════════════
//  PAGE
// ═════════════════════════════════════════════════════════════

export default function AnalyticsPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : '';

  useEffect(() => {
    apiFetch('/api/analytics/revenue', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-10 w-10 border-2 border-teal-500 border-t-transparent"></div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
        <p className="text-slate-500">Aucune donnée disponible</p>
      </div>
    );
  }

  const t = data.totals || {};
  const monthlyChart = (data.monthlyRevenue || []).map((m: any) => ({
    label: m.label,
    revenue: m.revenue || 0,
  }));

  const totalPlanMrr = (data.byPlan || []).reduce((s: number, p: any) => s + p.mrr, 0);

  return (
    <div className="space-y-5">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <p className="text-xs font-black text-teal-600 uppercase tracking-widest mb-1">Business Intelligence</p>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">Analytics revenus</h1>
          <p className="text-slate-500 mt-1 text-sm">
            Analyse détaillée du MRR par plan, type et module
          </p>
        </div>
        <p className="text-xs text-slate-400">
          Mise à jour : {new Date(data.generatedAt).toLocaleTimeString('fr-FR')}
        </p>
      </div>

      {/* KPI Hero */}
      <div className="bg-slate-900 rounded-2xl p-5 text-white">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest mb-1">MRR</p>
            <p className="text-2xl font-black tabular-nums text-teal-400">
              {fmtCompact(t.mrr)} <span className="text-xs text-slate-400">Ar</span>
            </p>
          </div>
          <div>
            <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest mb-1">ARR</p>
            <p className="text-2xl font-black tabular-nums text-blue-400">
              {fmtCompact(t.arr)} <span className="text-xs text-slate-400">Ar</span>
            </p>
          </div>
          <div>
            <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest mb-1">ARPU</p>
            <p className="text-2xl font-black tabular-nums text-amber-400">
              {fmtCompact(t.arpu)} <span className="text-xs text-slate-400">Ar</span>
            </p>
          </div>
          <div>
            <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest mb-1">Clients payants</p>
            <p className="text-2xl font-black tabular-nums text-purple-400">
              {t.payingClients} <span className="text-xs text-slate-400">/ {t.totalClients}</span>
            </p>
          </div>
        </div>
      </div>

      {/* Revenus 12 mois + prévision */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5">
        <div className="flex items-start justify-between mb-4 flex-wrap gap-3">
          <div>
            <h3 className="font-black text-slate-900 text-base">Revenus mensuels</h3>
            <p className="text-xs text-slate-500 mt-0.5">12 mois passés + prévision 3 mois</p>
          </div>
          <div className="flex flex-wrap items-center gap-3 text-[10px]">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-blue-500"></span>
              <span className="font-bold text-slate-700">Réel</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-amber-400"></span>
              <span className="font-bold text-slate-700">Prévision</span>
            </span>
          </div>
        </div>

        <RevenueChart data={monthlyChart} />

        {/* Prévision */}
        <div className="grid grid-cols-3 gap-3 mt-4 pt-4 border-t border-slate-100">
          {(data.forecast || []).map((f: any) => (
            <div key={f.month} className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-center">
              <p className="text-[10px] text-amber-700 uppercase font-black tracking-widest mb-1 capitalize">
                {f.label} (prévu)
              </p>
              <p className="text-lg font-black text-amber-700 tabular-nums">
                {fmtAr(f.revenue)} <span className="text-xs">Ar</span>
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* MRR par plan + par type */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Par plan */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5">
          <h3 className="font-black text-slate-900 text-base mb-4">MRR par plan</h3>
          <div className="space-y-3">
            {(data.byPlan || []).map((p: any) => {
              const pct = totalPlanMrr > 0 ? Math.round((p.mrr / totalPlanMrr) * 100) : 0;
              return (
                <div key={p.plan}>
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-sm" style={{ background: PLAN_COLORS[p.plan] }}></span>
                      <span className="text-sm font-bold text-slate-900">{p.plan}</span>
                      <span className="text-[10px] text-slate-400">
                        {p.count} client{p.count > 1 ? 's' : ''}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-[10px] text-slate-400 font-bold tabular-nums">
                        {pct}%
                      </span>
                      <span className="text-sm font-black text-slate-900 tabular-nums">
                        {fmtCompact(p.mrr)} Ar
                      </span>
                    </div>
                  </div>
                  <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{ width: Math.max(pct, 2) + '%', background: PLAN_COLORS[p.plan] }}
                    />
                  </div>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    ARR : {fmtAr(p.arr)} Ar
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Par type */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5">
          <h3 className="font-black text-slate-900 text-base mb-4">MRR par type d'organisation</h3>
          <div className="space-y-2.5">
            {(data.byType || []).map((ty: any) => {
              const maxMrr = data.byType[0]?.mrr || 1;
              const pct = Math.round((ty.mrr / maxMrr) * 100);
              return (
                <div key={ty.type}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-xs font-bold text-slate-700 truncate">{ty.type}</span>
                      <span className="text-[10px] text-slate-400 shrink-0">
                        {ty.count} org{ty.count > 1 ? 's' : ''} · ARPU {fmtCompact(ty.arpu)} Ar
                      </span>
                    </div>
                    <span className="text-sm font-black text-slate-900 tabular-nums shrink-0 ml-2">
                      {fmtCompact(ty.mrr)} Ar
                    </span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-blue-500 to-teal-400 rounded-full"
                      style={{ width: Math.max(pct, 2) + '%' }}
                    />
                  </div>
                </div>
              );
            })}
            {(data.byType || []).length === 0 && (
              <p className="text-xs text-slate-400 text-center py-6">Aucun client payant</p>
            )}
          </div>
        </div>
      </div>

      {/* MRR par module */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-black text-slate-900 text-base">MRR par module</h3>
            <p className="text-xs text-slate-500 mt-0.5">Contribution de chaque module au revenu mensuel</p>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="p-3 text-[10px] font-black text-slate-500 uppercase tracking-wider">Module</th>
                <th className="p-3 text-[10px] font-black text-slate-500 uppercase tracking-wider text-right">Abonnés</th>
                <th className="p-3 text-[10px] font-black text-slate-500 uppercase tracking-wider text-right">MRR</th>
                <th className="p-3 text-[10px] font-black text-slate-500 uppercase tracking-wider text-right">ARR</th>
                <th className="p-3 text-[10px] font-black text-slate-500 uppercase tracking-wider text-right">Part</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {(data.byModule || []).map((m: any) => {
                const totalModuleMrr = data.byModule.reduce((s: number, x: any) => s + x.mrr, 0);
                const pct = totalModuleMrr > 0 ? Math.round((m.mrr / totalModuleMrr) * 100) : 0;
                return (
                  <tr key={m.name} className="hover:bg-slate-50">
                    <td className="p-3">
                      <span className="font-bold text-slate-900">{m.name}</span>
                    </td>
                    <td className="p-3 text-right text-slate-700 tabular-nums font-bold">
                      {m.subscribers}
                    </td>
                    <td className="p-3 text-right font-black text-slate-900 tabular-nums">
                      {fmtAr(m.mrr)} <span className="text-xs text-slate-400 font-normal">Ar</span>
                    </td>
                    <td className="p-3 text-right text-slate-700 tabular-nums">
                      {fmtCompact(m.mrr * 12)} <span className="text-xs text-slate-400">Ar</span>
                    </td>
                    <td className="p-3 text-right">
                      <span className="inline-flex items-center gap-1.5 text-xs font-black text-slate-700 tabular-nums">
                        {pct}%
                      </span>
                    </td>
                  </tr>
                );
              })}
              {(data.byModule || []).length === 0 && (
                <tr>
                  <td colSpan={5} className="p-6 text-center text-slate-400 text-xs">
                    Aucun module souscrit
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Top 20 clients */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <div>
            <h3 className="font-black text-slate-900 text-base">Top 20 clients</h3>
            <p className="text-xs text-slate-500 mt-0.5">Classés par MRR décroissant</p>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="p-3 text-[10px] font-black text-slate-500 uppercase tracking-wider w-8">#</th>
                <th className="p-3 text-[10px] font-black text-slate-500 uppercase tracking-wider">Client</th>
                <th className="p-3 text-[10px] font-black text-slate-500 uppercase tracking-wider hidden md:table-cell">Type</th>
                <th className="p-3 text-[10px] font-black text-slate-500 uppercase tracking-wider hidden lg:table-cell">Ville</th>
                <th className="p-3 text-[10px] font-black text-slate-500 uppercase tracking-wider text-center">Modules</th>
                <th className="p-3 text-[10px] font-black text-slate-500 uppercase tracking-wider text-center">Plan</th>
                <th className="p-3 text-[10px] font-black text-slate-500 uppercase tracking-wider text-right">MRR</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {(data.topClients || []).map((c: any, i: number) => (
                <tr key={c.orgId} className="hover:bg-slate-50">
                  <td className="p-3">
                    <div className={
                      'w-6 h-6 rounded flex items-center justify-center font-black text-[10px] ' +
                      (i === 0 ? 'bg-amber-400 text-white' :
                       i === 1 ? 'bg-slate-300 text-slate-800' :
                       i === 2 ? 'bg-orange-300 text-orange-900' :
                       'bg-slate-100 text-slate-500')
                    }>
                      {i + 1}
                    </div>
                  </td>
                  <td className="p-3">
                    <a
                      href={'/dashboard/organizations'}
                      className="font-bold text-slate-900 hover:text-teal-600 truncate block"
                    >
                      {c.name}
                    </a>
                  </td>
                  <td className="p-3 text-slate-600 text-xs hidden md:table-cell">
                    {c.type || '—'}
                  </td>
                  <td className="p-3 text-slate-600 text-xs hidden lg:table-cell">
                    {c.city || '—'}
                  </td>
                  <td className="p-3 text-center text-slate-700 tabular-nums font-bold">
                    {c.modulesCount}
                  </td>
                  <td className="p-3 text-center">
                    <span
                      className="inline-block text-[10px] font-black tracking-wider px-2 py-0.5 rounded"
                      style={{
                        background: (PLAN_COLORS[c.plan] || '#94a3b8') + '20',
                        color: PLAN_COLORS[c.plan] || '#94a3b8',
                      }}
                    >
                      {c.plan?.toUpperCase()}
                    </span>
                  </td>
                  <td className="p-3 text-right font-black text-slate-900 tabular-nums">
                    {fmtAr(c.mrr)} <span className="text-xs text-slate-400 font-normal">Ar</span>
                  </td>
                </tr>
              ))}
              {(data.topClients || []).length === 0 && (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-400 text-sm">
                    Aucun client payant
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
