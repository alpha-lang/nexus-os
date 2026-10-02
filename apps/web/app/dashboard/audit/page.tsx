
'use client';

import { useState, useEffect, useMemo } from 'react';
import { apiFetch } from '../../../lib/api';

// ═════════════════════════════════════════════════════════════
//  CONSTANTES
// ═════════════════════════════════════════════════════════════

const ACTION_META: Record<string, { label: string; icon: string; color: string; bg: string }> = {
  CREATE:  { label: 'Création',    icon: '➕', color: 'text-emerald-700', bg: 'bg-emerald-100' },
  UPDATE:  { label: 'Modif.',      icon: '✏️', color: 'text-blue-700',   bg: 'bg-blue-100' },
  DELETE:  { label: 'Suppr.',      icon: '🗑️', color: 'text-red-700',    bg: 'bg-red-100' },
  SUSPEND: { label: 'Suspension',  icon: '🚫', color: 'text-amber-700',  bg: 'bg-amber-100' },
  REACTIVATE: { label: 'Réactivation', icon: '✅', color: 'text-emerald-700', bg: 'bg-emerald-100' },
  IMPERSONATE: { label: 'Impersonation', icon: '��️', color: 'text-purple-700', bg: 'bg-purple-100' },
  LOGIN:   { label: 'Connexion',   icon: '🔑', color: 'text-slate-700',  bg: 'bg-slate-100' },
  LOGOUT:  { label: 'Déconnexion', icon: '👋', color: 'text-slate-700',  bg: 'bg-slate-100' },
};

function actionMeta(action: string) {
  for (const [key, meta] of Object.entries(ACTION_META)) {
    if (action.toUpperCase().includes(key)) return meta;
  }
  return { label: action, icon: '📌', color: 'text-slate-700', bg: 'bg-slate-100' };
}

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('fr-FR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
  });
}

function fmtTime(d: string) {
  return new Date(d).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

function dayKey(d: string) {
  const dt = new Date(d);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
}

function dayLabel(d: string) {
  const dt = new Date(d);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const dd = new Date(dt);
  dd.setHours(0, 0, 0, 0);

  if (dd.getTime() === today.getTime()) return "Aujourd'hui";
  if (dd.getTime() === yesterday.getTime()) return 'Hier';
  return dt.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}

// ═════════════════════════════════════════════════════════════
//  PAGE
// ═════════════════════════════════════════════════════════════

export default function AuditPage() {
  const [items, setItems] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [entities, setEntities] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);

  // Filtres
  const [search, setSearch] = useState('');
  const [entityFilter, setEntityFilter] = useState('');
  const [preset, setPreset] = useState<'today' | 'week' | 'month' | 'all'>('week');
  const [onlyErrors, setOnlyErrors] = useState(false);

  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : '';

  async function load(reset = true) {
    if (reset) {
      setLoading(true);
    } else {
      setLoadingMore(true);
    }

    const params = new URLSearchParams();
    params.set('take', '50');
    if (search) params.set('search', search);
    if (entityFilter) params.set('entity', entityFilter);
    if (!reset && nextCursor) params.set('cursor', nextCursor);

    // Date range
    const now = new Date();
    if (preset === 'today') {
      const start = new Date(now); start.setHours(0, 0, 0, 0);
      params.set('from', start.toISOString());
    } else if (preset === 'week') {
      const start = new Date(now.getTime() - 7 * 86400000);
      params.set('from', start.toISOString());
    } else if (preset === 'month') {
      const start = new Date(now.getTime() - 30 * 86400000);
      params.set('from', start.toISOString());
    }

    try {
      const res = await apiFetch(`/api/audit-logs?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();

      let newItems = data.items || [];
      if (onlyErrors) {
        newItems = newItems.filter((x: any) =>
          (x.action || '').toLowerCase().includes('error') ||
          (x.newValue || '').toLowerCase().includes('error')
        );
      }

      if (reset) {
        setItems(newItems);
      } else {
        setItems((prev) => [...prev, ...newItems]);
      }
      setNextCursor(data.nextCursor);
      setHasMore(data.hasMore);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }

  async function loadStats() {
    try {
      const res = await apiFetch('/api/audit-logs/stats?days=7', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setStats(data);
    } catch (err) { console.error(err); }
  }

  async function loadEntities() {
    try {
      const res = await apiFetch('/api/audit-logs/entities', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setEntities(Array.isArray(data) ? data : []);
    } catch (err) { console.error(err); }
  }

  useEffect(() => {
    Promise.all([load(), loadStats(), loadEntities()]).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const t = setTimeout(() => load(true), 300);
    return () => clearTimeout(t);
  }, [search, entityFilter, preset, onlyErrors]);

  // Group par jour
  const grouped = useMemo(() => {
    const map = new Map<string, { label: string; items: any[] }>();
    items.forEach((it) => {
      const key = dayKey(it.createdAt);
      if (!map.has(key)) map.set(key, { label: dayLabel(it.createdAt), items: [] });
      map.get(key)!.items.push(it);
    });
    return Array.from(map.entries()).sort((a, b) => b[0].localeCompare(a[0]));
  }, [items]);

  function exportCsv() {
    const headers = ['Date', 'User', 'Action', 'Entity', 'Entity ID', 'Organization', 'IP'];
    const rows = items.map((it) => [
      new Date(it.createdAt).toISOString(),
      it.user?.email || '—',
      it.action,
      it.entity || '—',
      it.entityId || '—',
      it.organization?.name || '—',
      it.ipAddress || '—',
    ]);
    const csv = [headers, ...rows].map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(';')).join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit-log-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-5">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <p className="text-xs font-black text-teal-600 uppercase tracking-widest mb-1">Sécurité</p>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">Journal d'audit</h1>
          <p className="text-slate-500 mt-1 text-sm">
            Traçabilité complète des actions sensibles
          </p>
        </div>
        <button
          onClick={exportCsv}
          disabled={items.length === 0}
          className="w-full sm:w-auto px-4 py-2.5 bg-white border-2 border-slate-300 rounded-xl text-sm font-semibold text-slate-700 hover:bg-slate-100 transition inline-flex items-center justify-center gap-2 disabled:opacity-50"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3M3 17V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
          </svg>
          Export CSV
        </button>
      </div>

      {/* KPI stats */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="bg-slate-900 rounded-2xl p-4 text-white">
            <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest mb-1">Actions 7j</p>
            <p className="text-2xl font-black tabular-nums text-teal-400">{stats.total}</p>
            <p className="text-[10px] text-slate-500 mt-0.5">derniers 7 jours</p>
          </div>
          <div className={'rounded-2xl p-4 border ' + (stats.errors > 0 ? 'bg-red-50 border-red-200' : 'bg-white border-slate-200')}>
            <p className={'text-[10px] uppercase font-black tracking-widest mb-1 ' + (stats.errors > 0 ? 'text-red-700' : 'text-slate-500')}>
              Erreurs
            </p>
            <p className={'text-2xl font-black tabular-nums ' + (stats.errors > 0 ? 'text-red-600' : 'text-slate-900')}>
              {stats.errors}
            </p>
            <p className="text-[10px] text-slate-400 mt-0.5">échecs récents</p>
          </div>
          <div className="bg-white rounded-2xl p-4 border border-slate-200">
            <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest mb-1">Top action</p>
            <p className="text-sm font-black text-slate-900 truncate">
              {stats.byAction[0]?.action?.slice(0, 30) || '—'}
            </p>
            <p className="text-[10px] text-slate-400 mt-0.5">
              {stats.byAction[0]?.count || 0} fois
            </p>
          </div>
          <div className="bg-white rounded-2xl p-4 border border-slate-200">
            <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest mb-1">Top user</p>
            <p className="text-sm font-black text-slate-900 truncate">
              {stats.byUser[0]?.name || stats.byUser[0]?.email || '—'}
            </p>
            <p className="text-[10px] text-slate-400 mt-0.5">
              {stats.byUser[0]?.count || 0} actions
            </p>
          </div>
        </div>
      )}

      {/* Filtres */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-3 space-y-3">
        <div className="relative">
          <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </span>
          <input
            type="text"
            placeholder="Rechercher par action, entité, ID…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:ring-2 focus:ring-teal-400 focus:border-teal-400 focus:bg-white transition"
          />
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {([
            { v: 'today', l: "Aujourd'hui" },
            { v: 'week', l: '7 jours' },
            { v: 'month', l: '30 jours' },
            { v: 'all', l: 'Tout' },
          ] as const).map((p) => (
            <button
              key={p.v}
              onClick={() => setPreset(p.v)}
              className={'px-3 py-1.5 rounded-lg text-xs font-bold transition ' + (
                preset === p.v ? 'bg-slate-900 text-white shadow' : 'bg-white border border-slate-200 text-slate-600 hover:border-slate-400'
              )}
            >
              {p.l}
            </button>
          ))}

          <span className="w-px h-5 bg-slate-200 mx-1"></span>

          <select
            value={entityFilter}
            onChange={(e) => setEntityFilter(e.target.value)}
            className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-700 cursor-pointer"
          >
            <option value="">Toutes entités</option>
            {entities.map((e) => (
              <option key={e} value={e}>{e}</option>
            ))}
          </select>

          <button
            onClick={() => setOnlyErrors(!onlyErrors)}
            className={'px-3 py-1.5 rounded-lg text-xs font-bold transition ' + (
              onlyErrors ? 'bg-red-500 text-white shadow' : 'bg-white border border-red-200 text-red-700 hover:bg-red-50'
            )}
          >
            ❌ Erreurs uniquement
          </button>

          <span className="ml-auto text-xs font-bold text-slate-500">
            {items.length} action{items.length > 1 ? 's' : ''}
          </span>
        </div>
      </div>

      {/* Liste groupée par jour */}
      {loading ? (
        <div className="flex justify-center items-center h-40">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-teal-500 border-t-transparent"></div>
        </div>
      ) : grouped.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
          <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center text-3xl mx-auto mb-3">📭</div>
          <p className="text-slate-600 font-bold">Aucune action trouvée</p>
          <p className="text-xs text-slate-400 mt-1">Modifiez les filtres ou la période</p>
        </div>
      ) : (
        <div className="space-y-4">
          {grouped.map(([key, group]) => (
            <div key={key} className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
              <div className="bg-slate-50 px-5 py-2.5 border-b border-slate-200 flex items-center justify-between">
                <h2 className="text-xs font-black text-slate-700 uppercase tracking-wider capitalize">
                  {group.label}
                </h2>
                <span className="text-[10px] font-black text-slate-400 bg-white border border-slate-200 px-2 py-0.5 rounded-md">
                  {group.items.length} action{group.items.length > 1 ? 's' : ''}
                </span>
              </div>

              <div className="divide-y divide-slate-100">
                {group.items.map((it) => {
                  const meta = actionMeta(it.action);
                  const isExpanded = expanded === it.id;
                  const hasError = (it.action || '').toLowerCase().includes('error');
                  const isImpersonate = (it.action || '').toUpperCase().includes('IMPERSONATE');

                  return (
                    <div key={it.id} className={'transition ' + (hasError ? 'bg-red-50/40' : isImpersonate ? 'bg-purple-50/30' : '')}>
                      <button
                        onClick={() => setExpanded(isExpanded ? null : it.id)}
                        className="w-full text-left px-4 sm:px-5 py-3 hover:bg-slate-50/80 transition flex items-center gap-3"
                      >
                        <div className={'w-8 h-8 rounded-lg flex items-center justify-center text-sm shrink-0 ' + meta.bg}>
                          {meta.icon}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-0.5">
                            <span className={'text-[10px] font-black tracking-wider px-1.5 py-0.5 rounded ' + meta.bg + ' ' + meta.color}>
                              {meta.label.toUpperCase()}
                            </span>
                            <span className="text-sm font-bold text-slate-900 truncate">
                              {it.action}
                            </span>
                            {hasError && (
                              <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-red-500 text-white">
                                ERREUR
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-slate-500 truncate">
                            {it.user?.email || 'Système'}
                            {it.entity && ` · ${it.entity}`}
                            {it.entityId && ` (${it.entityId.slice(-8)})`}
                            {it.organization?.name && ` · ${it.organization.name}`}
                          </p>
                        </div>

                        <div className="text-right shrink-0">
                          <p className="text-xs font-bold text-slate-700 tabular-nums">
                            {fmtTime(it.createdAt)}
                          </p>
                          <p className="text-[10px] text-slate-400">{fmtDate(it.createdAt)}</p>
                        </div>

                        <svg
                          className={'w-4 h-4 text-slate-400 shrink-0 transition-transform ' + (isExpanded ? 'rotate-90' : '')}
                          fill="none" stroke="currentColor" viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                        </svg>
                      </button>

                      {isExpanded && (
                        <div className="px-4 sm:px-5 pb-4 space-y-2 text-xs border-t border-slate-100 pt-3">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {it.entityId && (
                              <Field label="ID entité" value={it.entityId} mono />
                            )}
                            {it.ipAddress && (
                              <Field label="IP" value={it.ipAddress} mono />
                            )}
                          </div>

                          {it.oldValue && (
                            <div>
                              <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest mb-1">
                                Avant
                              </p>
                              <pre className="bg-slate-900 text-slate-100 p-3 rounded-lg overflow-x-auto text-[10px] font-mono max-h-48">
                                {prettyJson(it.oldValue)}
                              </pre>
                            </div>
                          )}

                          {it.newValue && (
                            <div>
                              <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest mb-1">
                                Après
                              </p>
                              <pre className="bg-slate-900 text-slate-100 p-3 rounded-lg overflow-x-auto text-[10px] font-mono max-h-48">
                                {prettyJson(it.newValue)}
                              </pre>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}

          {hasMore && (
            <div className="text-center pt-3">
              <button
                onClick={() => load(false)}
                disabled={loadingMore}
                className="px-5 py-2.5 bg-white border-2 border-slate-300 rounded-xl text-sm font-bold text-slate-700 hover:bg-slate-100 transition disabled:opacity-50"
              >
                {loadingMore ? 'Chargement...' : 'Charger plus'}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function prettyJson(str: string): string {
  try {
    const obj = JSON.parse(str);
    return JSON.stringify(obj, null, 2);
  } catch {
    return str;
  }
}

function Field({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="bg-slate-50 rounded-lg p-2 border border-slate-200">
      <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest mb-0.5">{label}</p>
      <p className={'text-xs font-bold text-slate-700 truncate ' + (mono ? 'font-mono' : '')}>{value}</p>
    </div>
  );
}
