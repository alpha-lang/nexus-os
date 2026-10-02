
'use client';

import { useState, useEffect } from 'react';
import { apiFetch } from '../../../lib/api';

// ═════════════════════════════════════════════════════════════
//  UTILS
// ═════════════════════════════════════════════════════════════

function statusMeta(status: string) {
  if (status === 'ok' || status === 'healthy') {
    return { label: 'Opérationnel', color: 'text-emerald-700', bg: 'bg-emerald-100', dot: 'bg-emerald-500' };
  }
  if (status === 'degraded') {
    return { label: 'Dégradé', color: 'text-amber-700', bg: 'bg-amber-100', dot: 'bg-amber-500' };
  }
  if (status === 'error') {
    return { label: 'Erreur', color: 'text-red-700', bg: 'bg-red-100', dot: 'bg-red-500' };
  }
  return { label: 'Inconnu', color: 'text-slate-700', bg: 'bg-slate-100', dot: 'bg-slate-400' };
}

function latencyColor(ms: number) {
  if (ms < 200) return 'text-emerald-600';
  if (ms < 500) return 'text-amber-600';
  return 'text-red-600';
}

function fmtNumber(n: number) {
  return (n || 0).toLocaleString('fr-FR');
}

// ═════════════════════════════════════════════════════════════
//  PAGE
// ═════════════════════════════════════════════════════════════

export default function MonitoringPage() {
  const [metrics, setMetrics] = useState<any>(null);
  const [dataStats, setDataStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : '';

  async function load() {
    try {
      const [m, d] = await Promise.all([
        apiFetch('/api/monitoring/metrics', { headers: { Authorization: `Bearer ${token}` } }).then((r) => r.json()),
        apiFetch('/api/monitoring/data-stats', { headers: { Authorization: `Bearer ${token}` } }).then((r) => r.json()),
      ]);
      setMetrics(m);
      setDataStats(d);
      setLastRefresh(new Date());
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    const i = setInterval(load, 30000);
    return () => clearInterval(i);
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-10 w-10 border-2 border-teal-500 border-t-transparent"></div>
      </div>
    );
  }

  const globalStatus = statusMeta(metrics?.status);
  const svc = metrics?.services || {};
  const sys = metrics?.system || {};

  return (
    <div className="space-y-5">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <p className="text-xs font-black text-teal-600 uppercase tracking-widest mb-1">Infrastructure</p>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">Monitoring</h1>
          <p className="text-slate-500 mt-1 text-sm">
            État des services et statistiques plateforme · auto-refresh 30s
          </p>
        </div>
        <button
          onClick={load}
          className="px-4 py-2.5 bg-white border-2 border-slate-300 rounded-xl text-sm font-semibold text-slate-700 hover:bg-slate-100 transition inline-flex items-center justify-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Rafraîchir
        </button>
      </div>

      {/* Status global */}
      <div className={'rounded-2xl p-4 sm:p-5 border-2 ' + (
        globalStatus.dot === 'bg-emerald-500' ? 'bg-emerald-50 border-emerald-200' :
        globalStatus.dot === 'bg-amber-500' ? 'bg-amber-50 border-amber-200' :
        'bg-red-50 border-red-200'
      )}>
        <div className="flex items-center gap-4 flex-wrap">
          <div className={'w-12 h-12 rounded-full flex items-center justify-center shrink-0 ' + globalStatus.bg}>
            <span className={'w-3 h-3 rounded-full animate-pulse ' + globalStatus.dot}></span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] uppercase font-black tracking-widest text-slate-500 mb-0.5">
              État global
            </p>
            <h2 className={'text-2xl font-black ' + globalStatus.color}>
              {globalStatus.label}
            </h2>
          </div>
          <div className="text-right shrink-0">
            <p className="text-[10px] uppercase font-black tracking-widest text-slate-500">Dernier check</p>
            <p className="text-sm font-bold text-slate-900 font-mono">
              {lastRefresh.toLocaleTimeString('fr-FR')}
            </p>
          </div>
        </div>
      </div>

      {/* Services */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {/* Database */}
        <div className={'rounded-2xl p-4 sm:p-5 border-2 ' + (
          svc.database?.status === 'ok' ? 'bg-white border-emerald-200' :
          svc.database?.status === 'error' ? 'bg-red-50 border-red-200' :
          'bg-white border-slate-200'
        )}>
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center text-white text-lg shrink-0">
                🗄️
              </div>
              <div>
                <h3 className="font-black text-slate-900 text-sm">Base de données</h3>
                <p className="text-[10px] text-slate-500">PostgreSQL · Neon</p>
              </div>
            </div>
            <span className={'inline-flex items-center gap-1.5 text-[10px] font-black tracking-widest px-2 py-1 rounded-md ' + statusMeta(svc.database?.status).bg + ' ' + statusMeta(svc.database?.status).color}>
              <span className={'w-1.5 h-1.5 rounded-full ' + statusMeta(svc.database?.status).dot}></span>
              {statusMeta(svc.database?.status).label.toUpperCase()}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="bg-slate-50 rounded-lg p-2.5">
              <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest mb-0.5">Latence</p>
              <p className={'text-xl font-black tabular-nums ' + latencyColor(svc.database?.latencyMs || 0)}>
                {svc.database?.latencyMs || 0} <span className="text-xs">ms</span>
              </p>
            </div>
            <div className="bg-slate-50 rounded-lg p-2.5">
              <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest mb-0.5">Provider</p>
              <p className="text-xs font-bold text-slate-700 truncate">Neon serverless</p>
            </div>
          </div>

          {svc.database?.error && (
            <div className="mt-3 p-2.5 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-[10px] font-black text-red-700 uppercase tracking-widest mb-1">Erreur</p>
              <p className="text-xs text-red-700 font-mono break-all">{svc.database.error}</p>
            </div>
          )}
        </div>

        {/* Redis */}
        <div className={'rounded-2xl p-4 sm:p-5 border-2 ' + (
          svc.redis?.status === 'ok' ? 'bg-white border-emerald-200' :
          svc.redis?.status === 'error' ? 'bg-red-50 border-red-200' :
          'bg-white border-slate-200'
        )}>
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center text-white text-lg shrink-0">
                ⚡
              </div>
              <div>
                <h3 className="font-black text-slate-900 text-sm">Redis / Cache</h3>
                <p className="text-[10px] text-slate-500">Upstash · Rate limiting</p>
              </div>
            </div>
            <span className={'inline-flex items-center gap-1.5 text-[10px] font-black tracking-widest px-2 py-1 rounded-md ' + statusMeta(svc.redis?.status).bg + ' ' + statusMeta(svc.redis?.status).color}>
              <span className={'w-1.5 h-1.5 rounded-full ' + statusMeta(svc.redis?.status).dot}></span>
              {svc.redis?.status === 'disabled' ? 'DÉSACTIVÉ' : statusMeta(svc.redis?.status).label.toUpperCase()}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="bg-slate-50 rounded-lg p-2.5">
              <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest mb-0.5">Latence</p>
              <p className={'text-xl font-black tabular-nums ' + latencyColor(svc.redis?.latencyMs || 0)}>
                {svc.redis?.latencyMs || 0} <span className="text-xs">ms</span>
              </p>
            </div>
            <div className="bg-slate-50 rounded-lg p-2.5">
              <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest mb-0.5">Provider</p>
              <p className="text-xs font-bold text-slate-700 truncate">Upstash TLS</p>
            </div>
          </div>

          {svc.redis?.error && (
            <div className="mt-3 p-2.5 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-[10px] font-black text-red-700 uppercase tracking-widest mb-1">Erreur</p>
              <p className="text-xs text-red-700 font-mono break-all">{svc.redis.error}</p>
            </div>
          )}
        </div>
      </div>

      {/* Système */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5">
        <h3 className="font-black text-slate-900 text-base mb-4">Système</h3>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatBox label="Uptime" value={sys.uptimeHuman || '—'} sub={fmtNumber(sys.uptimeSec) + ' sec'} />
          <StatBox label="Node" value={sys.node || '—'} sub={sys.platform + ' ' + sys.arch} />
          <StatBox label="Environnement" value={(sys.env || '').toUpperCase()} sub={sys.region || 'local'} />
          <StatBox label="Version" value={sys.commit || '—'} sub={sys.vercel ? 'Vercel' : 'Local'} />
        </div>
      </div>

      {/* Mémoire */}
      {sys.memory && (
        <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5">
          <h3 className="font-black text-slate-900 text-base mb-4">Mémoire</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <MemoryBar
              label="RSS"
              mb={sys.memory.rssMb}
              total={sys.memory.rssMb}
              color="from-blue-500 to-teal-400"
            />
            <MemoryBar
              label="Heap Used"
              mb={sys.memory.heapUsedMb}
              total={sys.memory.heapTotalMb}
              color="from-purple-500 to-pink-500"
            />
            <MemoryBar
              label="Heap Total"
              mb={sys.memory.heapTotalMb}
              total={sys.memory.heapTotalMb}
              color="from-amber-500 to-orange-500"
            />
            <MemoryBar
              label="Externe"
              mb={sys.memory.externalMb}
              total={sys.memory.rssMb}
              color="from-slate-500 to-slate-700"
            />
          </div>
        </div>
      )}

      {/* Data stats */}
      {dataStats && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
            <KpiCard label="Organisations" value={dataStats.totals?.organizations} sub={`+${dataStats.activity?.organizations30d || 0} sur 30j`} color="blue" />
            <KpiCard label="Utilisateurs" value={dataStats.totals?.users} sub={`+${dataStats.activity?.users?.d30 || 0} sur 30j`} color="teal" />
            <KpiCard label="Partenaires" value={dataStats.totals?.partners} sub="clients + fournisseurs" color="purple" />
            <KpiCard label="Réservations" value={dataStats.totals?.reservations} sub={`+${dataStats.activity?.reservations30d || 0} sur 30j`} color="amber" />
            <KpiCard label="Ventes" value={dataStats.totals?.sales} sub={`+${dataStats.activity?.sales30d || 0} sur 30j`} color="emerald" />
            <KpiCard label="Mouvements stock" value={dataStats.totals?.stockMovements} sub="total historique" color="slate" />
          </div>

          {/* Erreurs */}
          <div className={'rounded-2xl border-2 p-4 ' + (
            dataStats.errors?.recent7d > 0
              ? 'bg-red-50 border-red-200'
              : 'bg-emerald-50 border-emerald-200'
          )}>
            <div className="flex items-center gap-4 flex-wrap">
              <div className={'w-12 h-12 rounded-full flex items-center justify-center text-2xl shrink-0 ' + (
                dataStats.errors?.recent7d > 0 ? 'bg-red-100' : 'bg-emerald-100'
              )}>
                {dataStats.errors?.recent7d > 0 ? '⚠️' : '✅'}
              </div>
              <div className="flex-1 min-w-0">
                <p className={'text-[10px] uppercase font-black tracking-widest mb-0.5 ' + (
                  dataStats.errors?.recent7d > 0 ? 'text-red-700' : 'text-emerald-700'
                )}>
                  Erreurs récentes (7 jours)
                </p>
                <h2 className={'text-2xl font-black ' + (
                  dataStats.errors?.recent7d > 0 ? 'text-red-700' : 'text-emerald-700'
                )}>
                  {dataStats.errors?.recent7d || 0}
                </h2>
              </div>
              <a
                href="/dashboard/audit"
                className={'shrink-0 px-3 py-1.5 rounded-lg text-xs font-bold transition ' + (
                  dataStats.errors?.recent7d > 0
                    ? 'bg-red-600 text-white hover:bg-red-700'
                    : 'bg-emerald-600 text-white hover:bg-emerald-700'
                )}
              >
                Voir le journal
              </a>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ═════════════════════════════════════════════════════════════
//  SOUS-COMPOSANTS
// ═════════════════════════════════════════════════════════════

function StatBox({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="bg-slate-50 rounded-xl p-3 border border-slate-200">
      <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest mb-0.5">{label}</p>
      <p className="text-base font-black text-slate-900 truncate">{value}</p>
      {sub && <p className="text-[10px] text-slate-400 mt-0.5 truncate">{sub}</p>}
    </div>
  );
}

function MemoryBar({ label, mb, total, color }: { label: string; mb: number; total: number; color: string }) {
  const pct = total > 0 ? Math.round((mb / total) * 100) : 0;
  return (
    <div className="bg-slate-50 rounded-xl p-3 border border-slate-200">
      <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest mb-1">{label}</p>
      <p className="text-lg font-black text-slate-900 tabular-nums">
        {mb} <span className="text-xs text-slate-400">MB</span>
      </p>
      <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden mt-2">
        <div className={'h-full bg-gradient-to-r ' + color + ' rounded-full'} style={{ width: Math.max(pct, 3) + '%' }} />
      </div>
      <p className="text-[10px] text-slate-400 mt-1">{pct}%</p>
    </div>
  );
}

function KpiCard({ label, value, sub, color }: { label: string; value: number; sub?: string; color: string }) {
  const colors: Record<string, { text: string; bg: string; border: string }> = {
    blue:    { text: 'text-blue-600',    bg: 'bg-blue-50',    border: 'border-blue-200' },
    teal:    { text: 'text-teal-600',    bg: 'bg-teal-50',    border: 'border-teal-200' },
    purple:  { text: 'text-purple-600',  bg: 'bg-purple-50',  border: 'border-purple-200' },
    amber:   { text: 'text-amber-600',   bg: 'bg-amber-50',   border: 'border-amber-200' },
    emerald: { text: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200' },
    slate:   { text: 'text-slate-700',   bg: 'bg-slate-50',   border: 'border-slate-200' },
  };
  const c = colors[color] || colors.slate;
  return (
    <div className={'rounded-xl p-3 border ' + c.border + ' ' + c.bg}>
      <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest mb-0.5">{label}</p>
      <p className={'text-2xl font-black tabular-nums ' + c.text}>
        {fmtNumber(value || 0)}
      </p>
      {sub && <p className="text-[10px] text-slate-500 mt-0.5">{sub}</p>}
    </div>
  );
}
