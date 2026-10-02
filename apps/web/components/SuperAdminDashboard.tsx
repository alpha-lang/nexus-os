
'use client';

import { useMemo } from 'react';
import RevenueChart from './charts/RevenueChart';

// ═════════════════════════════════════════════════════════════
//  UTILS
// ═════════════════════════════════════════════════════════════

function fmtAr(n: number): string {
  return Math.round(n || 0).toLocaleString('fr-FR');
}

function fmtCompact(n: number): string {
  const v = Math.round(n || 0);
  if (v >= 1_000_000_000) return (v / 1_000_000_000).toFixed(1) + ' Md';
  if (v >= 1_000_000) return (v / 1_000_000).toFixed(1) + ' M';
  if (v >= 1_000) return (v / 1_000).toFixed(1) + 'k';
  return String(v);
}

function trendMeta(pct: number) {
  if (pct > 0) return { icon: '▲', color: 'text-emerald-600', bg: 'bg-emerald-50' };
  if (pct < 0) return { icon: '▼', color: 'text-red-600', bg: 'bg-red-50' };
  return { icon: '=', color: 'text-slate-400', bg: 'bg-slate-50' };
}

// ═════════════════════════════════════════════════════════════
//  SOUS-COMPOSANTS
// ═════════════════════════════════════════════════════════════

function KpiCard({
  label,
  value,
  sub,
  trend,
  accent = 'slate',
  size = 'md',
}: {
  label: string;
  value: string;
  sub?: string;
  trend?: number;
  accent?: 'slate' | 'emerald' | 'teal' | 'amber' | 'blue' | 'purple';
  size?: 'sm' | 'md' | 'lg';
}) {
  const accentMap = {
    slate:   { text: 'text-slate-900',   bg: 'bg-slate-50',   border: 'border-slate-200' },
    emerald: { text: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200' },
    teal:    { text: 'text-teal-600',    bg: 'bg-teal-50',    border: 'border-teal-200' },
    amber:   { text: 'text-amber-600',   bg: 'bg-amber-50',   border: 'border-amber-200' },
    blue:    { text: 'text-blue-600',    bg: 'bg-blue-50',    border: 'border-blue-200' },
    purple:  { text: 'text-purple-600',  bg: 'bg-purple-50',  border: 'border-purple-200' },
  };
  const a = accentMap[accent];
  const sizes = {
    sm: { value: 'text-lg', pad: 'p-3' },
    md: { value: 'text-2xl', pad: 'p-4' },
    lg: { value: 'text-3xl', pad: 'p-5' },
  };
  const s = sizes[size];

  return (
    <div className={'bg-white rounded-xl border ' + a.border + ' ' + s.pad}>
      <div className="flex items-start justify-between gap-2 mb-1">
        <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest">
          {label}
        </p>
        {trend !== undefined && (
          <span className={'inline-flex items-center gap-0.5 text-[10px] font-black px-1.5 py-0.5 rounded ' + trendMeta(trend).bg + ' ' + trendMeta(trend).color}>
            {trendMeta(trend).icon} {Math.abs(trend)}%
          </span>
        )}
      </div>
      <p className={'font-black tabular-nums leading-none ' + s.value + ' ' + a.text}>
        {value}
      </p>
      {sub && <p className="text-[10px] text-slate-400 mt-1.5">{sub}</p>}
    </div>
  );
}

function Sparkline({ data, color = '#14b8a6' }: { data: number[]; color?: string }) {
  if (!data.length) return null;
  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const range = max - min || 1;
  const w = 100;
  const h = 20;
  const points = data
    .map((v, i) => {
      const x = (i / (data.length - 1 || 1)) * w;
      const y = h - ((v - min) / range) * h;
      return x + ',' + y;
    })
    .join(' ');

  return (
    <svg viewBox={'0 0 ' + w + ' ' + h} className="w-full h-5" preserveAspectRatio="none">
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}

function CohortHeatmap({ cohorts }: { cohorts: any[] }) {
  if (!cohorts.length) return null;
  return (
    <div className="space-y-2">
      {cohorts.map((c) => {
        const activeRate = c.total > 0 ? Math.round((c.active / c.total) * 100) : 0;
        const bg =
          activeRate >= 80 ? 'bg-emerald-500' :
          activeRate >= 50 ? 'bg-emerald-400' :
          activeRate >= 20 ? 'bg-amber-400' :
          'bg-slate-300';
        return (
          <div key={c.month} className="flex items-center gap-3 text-xs">
            <div className="w-16 text-[10px] text-slate-500 font-bold capitalize shrink-0">
              {c.label}
            </div>
            <div className="flex-1 flex items-center gap-1">
              <div className="flex-1 h-4 bg-slate-100 rounded overflow-hidden flex">
                {c.active > 0 && (
                  <div className="h-full bg-emerald-500" style={{ width: (c.active / c.total) * 100 + '%' }} />
                )}
                {c.trial > 0 && (
                  <div className="h-full bg-amber-400" style={{ width: (c.trial / c.total) * 100 + '%' }} />
                )}
              </div>
              <span className="text-[10px] font-black text-slate-700 tabular-nums w-8 text-right">
                {c.total}
              </span>
            </div>
            <div className={'w-12 text-center text-[10px] font-black text-white rounded px-1 py-0.5 ' + bg}>
              {activeRate}%
            </div>
            <div className="w-16 text-right text-[10px] font-bold text-slate-600 tabular-nums">
              {fmtCompact(c.mrr)} Ar
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ═════════════════════════════════════════════════════════════
//  DASHBOARD SUPER ADMIN
// ═════════════════════════════════════════════════════════════

export default function SuperAdminDashboard({ stats }: { stats: any }) {
  const monthlyRevenue = useMemo(
    () => (stats.monthlyRevenue || []).map((m: any) => ({ label: m.label, revenue: m.revenue || 0 })),
    [stats.monthlyRevenue],
  );
  const revenueTrend = useMemo(
    () => (stats.monthlyRevenue || []).slice(-6).map((m: any) => m.revenue || 0),
    [stats.monthlyRevenue],
  );
  const orgsTrend = useMemo(
    () => (stats.cohorts || []).map((c: any) => c.total),
    [stats.cohorts],
  );
  const mrrTrend = useMemo(
    () => (stats.cohorts || []).map((c: any) => c.mrr),
    [stats.cohorts],
  );

  const f = stats.financial || {};
  const o = stats.organizations || {};
  const u = stats.users || {};

  return (
    <div className="space-y-5">
      {/* ═══════ HERO ═══════ */}
      <div className="bg-slate-900 rounded-2xl p-4 sm:p-5 text-white">
        <div className="flex items-center justify-between flex-wrap gap-3 mb-5">
          <div>
            <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest mb-1">
              Cockpit plateforme
            </p>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight">
              Vue Super Admin
            </h1>
          </div>
          <div className="text-right">
            <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest">
              Mis à jour
            </p>
            <p className="text-xs text-slate-300 font-mono">
              {new Date(stats.generatedAt).toLocaleTimeString('fr-FR')}
            </p>
          </div>
        </div>

        {/* KPI Financiers — la vraie valeur */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-slate-800/60 rounded-xl p-3 border border-slate-700/60">
            <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest mb-1">MRR</p>
            <p className="text-2xl font-black tabular-nums text-teal-400">{fmtCompact(f.mrr)} <span className="text-xs text-slate-400">Ar</span></p>
            <div className="mt-1"><Sparkline data={mrrTrend} color="#2dd4bf" /></div>
          </div>
          <div className="bg-slate-800/60 rounded-xl p-3 border border-slate-700/60">
            <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest mb-1">ARR</p>
            <p className="text-2xl font-black tabular-nums text-blue-400">{fmtCompact(f.arr)} <span className="text-xs text-slate-400">Ar</span></p>
            <p className="text-[10px] text-slate-500 mt-1">MRR × 12</p>
          </div>
          <div className="bg-slate-800/60 rounded-xl p-3 border border-slate-700/60">
            <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest mb-1">ARPU</p>
            <p className="text-2xl font-black tabular-nums text-amber-400">{fmtCompact(f.arpu)} <span className="text-xs text-slate-400">Ar</span></p>
            <p className="text-[10px] text-slate-500 mt-1">Revenu / client actif</p>
          </div>
          <div className="bg-slate-800/60 rounded-xl p-3 border border-slate-700/60">
            <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest mb-1">Churn</p>
            <p className={'text-2xl font-black tabular-nums ' + (f.churnRate > 5 ? 'text-red-400' : 'text-emerald-400')}>
              {f.churnRate}%
            </p>
            <p className="text-[10px] text-slate-500 mt-1">{o.expired || 0} inactifs</p>
          </div>
        </div>
      </div>

      {/* ═══════ ROW 2 : KPI secondaires ═══════ */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard
          label="Organisations"
          value={String(o.total)}
          sub={o.active + ' actives · ' + o.trial + ' en essai'}
          accent="blue"
          trend={undefined}
        />
        <KpiCard
          label="Revenus du mois"
          value={fmtCompact(f.currentMonthRevenue) + ' Ar'}
          sub={f.paymentsThisMonth + ' paiements · ' + f.pendingPayments + ' en attente'}
          accent="emerald"
          trend={f.revenueGrowth}
        />
        <KpiCard
          label="Utilisateurs"
          value={String(u.total)}
          sub={u.active + ' actifs'}
          accent="purple"
        />
        <KpiCard
          label="Modules catalogue"
          value={String(stats.modules?.total || 0)}
          sub="vendables aux clients"
          accent="amber"
        />
      </div>

      {/* ═══════ ROW 3 : Revenus + Répartition ═══════ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 p-4 sm:p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-black text-slate-900 text-base">Revenus 12 mois</h3>
              <p className="text-xs text-slate-500 mt-0.5">Paiements encaissés cumulés</p>
            </div>
            <a href="/dashboard/billing" className="text-xs font-bold text-teal-600 hover:underline">
              Voir détail →
            </a>
          </div>
          <RevenueChart data={monthlyRevenue} />
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5">
          <h3 className="font-black text-slate-900 text-base mb-4">Répartition tenants</h3>
          <div className="space-y-3">
            {(stats.distribution?.byType || []).map((t: any) => (
              <div key={t.type}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold text-slate-700">{t.type}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-black text-slate-900 tabular-nums">{t.count}</span>
                    <span className="text-[10px] text-slate-400 font-bold tabular-nums w-8 text-right">
                      {t.pct}%
                    </span>
                  </div>
                </div>
                <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-blue-500 to-teal-400 rounded-full" style={{ width: Math.max(t.pct, 2) + '%' }} />
                </div>
              </div>
            ))}
            {(stats.distribution?.byType || []).length === 0 && (
              <p className="text-xs text-slate-400 text-center py-6">Aucune organisation</p>
            )}
          </div>
        </div>
      </div>

      {/* ═══════ ROW 4 : Cohortes + Top clients ═══════ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-black text-slate-900 text-base">Cohortes</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Inscriptions par mois · taux de conversion en actif
              </p>
            </div>
          </div>
          <CohortHeatmap cohorts={stats.cohorts || []} />
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-black text-slate-900 text-base">Top 10 clients</h3>
              <p className="text-xs text-slate-500 mt-0.5">Par MRR mensuel</p>
            </div>
            <a href="/dashboard/organizations" className="text-xs font-bold text-teal-600 hover:underline">
              Voir tout →
            </a>
          </div>
          <div className="space-y-2">
            {(stats.topClients || []).slice(0, 10).map((c: any, i: number) => (
              <div key={c.id} className="flex items-center gap-3">
                <div className={
                  'w-7 h-7 rounded-lg flex items-center justify-center font-black text-xs shrink-0 ' +
                  (i === 0 ? 'bg-amber-400 text-white' :
                   i === 1 ? 'bg-slate-300 text-slate-800' :
                   i === 2 ? 'bg-orange-300 text-orange-900' :
                   'bg-slate-100 text-slate-500')
                }>
                  {i + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-slate-900 text-sm truncate">{c.name}</p>
                  <p className="text-[10px] text-slate-500">
                    {c.type}{c.city ? ' · ' + c.city : ''} · {c.users} user{c.users > 1 ? 's' : ''}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="font-black text-slate-900 text-sm tabular-nums">{fmtAr(c.mrr)}</p>
                  <p className="text-[9px] text-slate-400">Ar / mois</p>
                </div>
              </div>
            ))}
            {(stats.topClients || []).length === 0 && (
              <p className="text-xs text-slate-400 text-center py-6">Aucun client payant</p>
            )}
          </div>
        </div>
      </div>

      {/* ═══════ ROW 5 : Derniers paiements ═══════ */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <h3 className="font-black text-slate-900 text-sm">Derniers paiements</h3>
          <a href="/dashboard/billing" className="text-[10px] font-black text-teal-600 hover:underline tracking-wider">
            VOIR TOUT →
          </a>
        </div>
        <div className="divide-y divide-slate-100">
          {(stats.recentPayments || []).map((p: any) => {
            const isPaid = p.status === 'PAID';
            return (
              <div key={p.id} className="px-5 py-3 flex items-center gap-3 hover:bg-slate-50/60">
                <div className={'w-1 self-stretch rounded-full ' + (isPaid ? 'bg-emerald-400' : 'bg-amber-400')} />
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-slate-900 text-sm truncate">{p.organization?.name}</p>
                  <p className="text-[10px] text-slate-500">
                    {new Date(p.date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })}
                    {' · '}
                    {isPaid ? 'Payée' : 'En attente'}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className={'font-black text-sm tabular-nums ' + (isPaid ? 'text-emerald-600' : 'text-amber-600')}>
                    {fmtAr(p.amount)} <span className="text-[10px] text-slate-400">Ar</span>
                  </p>
                </div>
              </div>
            );
          })}
          {(stats.recentPayments || []).length === 0 && (
            <p className="p-6 text-center text-xs text-slate-400">Aucun paiement</p>
          )}
        </div>
      </div>

      {/* ═══════ Quick actions ═══════ */}
      <div>
        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">
          Actions rapides
        </p>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
          {[
            { label: 'Nouvelle org', href: '/dashboard/organizations', icon: '🏢' },
            { label: 'Utilisateurs', href: '/dashboard/users', icon: '👥' },
            { label: 'Modules', href: '/dashboard/modules', icon: '📦' },
            { label: 'Abonnements', href: '/dashboard/subscriptions', icon: '💳' },
            { label: 'Facturation', href: '/dashboard/billing', icon: '💰' },
            { label: 'Admins tenants', href: '/dashboard/tenant-admins', icon: '🛡️' },
          ].map((q) => (
            <a
              key={q.href}
              href={q.href}
              className="flex items-center gap-2 px-3 py-2 bg-white rounded-lg border border-slate-200 hover:border-slate-400 hover:shadow-sm transition"
            >
              <span className="text-base shrink-0">{q.icon}</span>
              <span className="text-[11px] font-bold text-slate-700 truncate">{q.label}</span>
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
