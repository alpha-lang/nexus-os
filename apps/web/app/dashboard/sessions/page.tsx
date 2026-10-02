
'use client';

import { useState, useEffect, useMemo } from 'react';
import { apiFetch } from '../../../lib/api';
import ConfirmDialog from '../../../components/ConfirmDialog';

// ═════════════════════════════════════════════════════════════
//  UTILS
// ═════════════════════════════════════════════════════════════

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('fr-FR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
  });
}

function fmtTime(d: string) {
  return new Date(d).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}

function timeAgo(d: string) {
  const diff = Date.now() - new Date(d).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return "à l'instant";
  if (min < 60) return `il y a ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `il y a ${h}h`;
  const j = Math.floor(h / 24);
  return `il y a ${j}j`;
}

function expiresIn(d: string) {
  const diff = new Date(d).getTime() - Date.now();
  if (diff <= 0) return 'expiré';
  const min = Math.floor(diff / 60000);
  if (min < 60) return `expire dans ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `expire dans ${h}h`;
  const j = Math.floor(h / 24);
  return `expire dans ${j}j`;
}

function parseUserAgent(ua: string | null): { browser: string; os: string; device: string } {
  if (!ua) return { browser: 'Inconnu', os: 'Inconnu', device: 'desktop' };

  const u = ua.toLowerCase();
  let browser = 'Autre';
  if (u.includes('chrome') && !u.includes('edg')) browser = 'Chrome';
  else if (u.includes('firefox')) browser = 'Firefox';
  else if (u.includes('safari') && !u.includes('chrome')) browser = 'Safari';
  else if (u.includes('edg')) browser = 'Edge';
  else if (u.includes('curl')) browser = 'cURL';
  else if (u.includes('postman')) browser = 'Postman';

  let os = 'Autre';
  if (u.includes('windows')) os = 'Windows';
  else if (u.includes('mac os')) os = 'macOS';
  else if (u.includes('linux')) os = 'Linux';
  else if (u.includes('android')) os = 'Android';
  else if (u.includes('iphone') || u.includes('ipad')) os = 'iOS';

  let device = 'desktop';
  if (u.includes('mobile') || u.includes('android')) device = 'mobile';
  else if (u.includes('tablet') || u.includes('ipad')) device = 'tablet';

  return { browser, os, device };
}

function deviceIcon(device: string) {
  if (device === 'mobile') return '📱';
  if (device === 'tablet') return '📲';
  return '💻';
}

// ═════════════════════════════════════════════════════════════
//  PAGE
// ═════════════════════════════════════════════════════════════

export default function SessionsPage() {
  const [sessions, setSessions] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  // Filtres
  const [search, setSearch] = useState('');
  const [orgFilter, setOrgFilter] = useState('');
  const [showRevoked, setShowRevoked] = useState(false);

  // Confirmations
  const [revokeTarget, setRevokeTarget] = useState<any>(null);
  const [revokeAllTarget, setRevokeAllTarget] = useState<any>(null);

  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : '';

  async function load() {
    try {
      const [sessionsRes, statsRes] = await Promise.all([
        apiFetch(`/api/auth/sessions?take=200${showRevoked ? '' : ''}`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        apiFetch('/api/auth/sessions/stats', {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      const sessionsData = await sessionsRes.json();
      const statsData = statsRes.ok ? await statsRes.json() : null;

      setSessions(Array.isArray(sessionsData) ? sessionsData : []);
      setStats(statsData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    const i = setInterval(load, 30000); // refresh toutes les 30s
    return () => clearInterval(i);
  }, []);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  }

  async function doRevoke() {
    if (!revokeTarget) return;
    setBusy(revokeTarget.id);
    const res = await apiFetch(`/api/auth/sessions/${revokeTarget.id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    setBusy(null);
    setRevokeTarget(null);
    showToast(data.message || 'Session révoquée');
    await load();
  }

  async function doRevokeAll() {
    if (!revokeAllTarget) return;
    setBusy(revokeAllTarget.user.id);
    const res = await apiFetch(`/api/auth/sessions/user/${revokeAllTarget.user.id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    setBusy(null);
    setRevokeAllTarget(null);
    showToast(data.message || 'Sessions révoquées');
    await load();
  }

  // Filtrage
  const filtered = useMemo(() => {
    let list = [...sessions];

    if (!showRevoked) {
      list = list.filter((s) => s.isActive);
    }

    if (orgFilter) {
      list = list.filter((s) => s.user?.organization?.id === orgFilter);
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((s) => {
        const email = (s.user?.email || '').toLowerCase();
        const name = (s.user?.name || '').toLowerCase();
        const ip = (s.ipAddress || '').toLowerCase();
        const org = (s.user?.organization?.name || '').toLowerCase();
        return email.includes(q) || name.includes(q) || ip.includes(q) || org.includes(q);
      });
    }

    return list;
  }, [sessions, search, orgFilter, showRevoked]);

  // Grouper par user
  const grouped = useMemo(() => {
    const map = new Map<string, { user: any; sessions: any[] }>();
    filtered.forEach((s) => {
      const uid = s.user?.id || 'unknown';
      if (!map.has(uid)) map.set(uid, { user: s.user, sessions: [] });
      map.get(uid)!.sessions.push(s);
    });
    return Array.from(map.entries()).sort((a, b) => b[1].sessions.length - a[1].sessions.length);
  }, [filtered]);

  const orgs = useMemo(() => {
    const set = new Map<string, { id: string; name: string; count: number }>();
    sessions.forEach((s) => {
      const org = s.user?.organization;
      if (!org) return;
      if (!set.has(org.id)) set.set(org.id, { id: org.id, name: org.name, count: 0 });
      set.get(org.id)!.count++;
    });
    return Array.from(set.values()).sort((a, b) => b.count - a.count);
  }, [sessions]);

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
          <p className="text-xs font-black text-teal-600 uppercase tracking-widest mb-1">Sécurité</p>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">Sessions actives</h1>
          <p className="text-slate-500 mt-1 text-sm">
            Surveillance des connexions en temps réel · rafraîchi toutes les 30s
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

      {/* KPI stats */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="bg-slate-900 rounded-2xl p-4 text-white">
            <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest mb-1">Sessions actives</p>
            <p className="text-2xl font-black tabular-nums text-teal-400">{stats.totalActive}</p>
            <p className="text-[10px] text-slate-500 mt-0.5">{stats.totalUniqueUsers} utilisateurs</p>
          </div>
          <div className="bg-white rounded-2xl p-4 border border-slate-200">
            <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest mb-1">Nouvelles 24h</p>
            <p className="text-2xl font-black text-slate-900 tabular-nums">{stats.created24h}</p>
            <p className="text-[10px] text-slate-400 mt-0.5">{stats.created7d} sur 7 jours</p>
          </div>
          <div className="bg-white rounded-2xl p-4 border border-slate-200">
            <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest mb-1">Top user</p>
            <p className="text-sm font-black text-slate-900 truncate">
              {stats.topUsers?.[0]?.name || stats.topUsers?.[0]?.email || '—'}
            </p>
            <p className="text-[10px] text-slate-400 mt-0.5">
              {stats.topUsers?.[0]?.count || 0} session{stats.topUsers?.[0]?.count > 1 ? 's' : ''}
            </p>
          </div>
          <div className="bg-white rounded-2xl p-4 border border-slate-200">
            <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest mb-1">Révoquées</p>
            <p className="text-2xl font-black text-slate-400 tabular-nums">{stats.totalRevoked}</p>
            <p className="text-[10px] text-slate-400 mt-0.5">historique</p>
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
            placeholder="Rechercher par email, IP, organisation…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:ring-2 focus:ring-teal-400 focus:border-teal-400 focus:bg-white transition"
          />
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <select
            value={orgFilter}
            onChange={(e) => setOrgFilter(e.target.value)}
            className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-700 cursor-pointer"
          >
            <option value="">Toutes organisations</option>
            {orgs.map((o) => (
              <option key={o.id} value={o.id}>{o.name} ({o.count})</option>
            ))}
          </select>

          <button
            onClick={() => setShowRevoked(!showRevoked)}
            className={'px-3 py-1.5 rounded-lg text-xs font-bold transition ' + (
              showRevoked ? 'bg-slate-700 text-white shadow' : 'bg-white border border-slate-200 text-slate-600 hover:border-slate-400'
            )}
          >
            {showRevoked ? '✓ ' : ''}Afficher les révoquées
          </button>

          <span className="ml-auto text-xs font-bold text-slate-500">
            {filtered.length} session{filtered.length > 1 ? 's' : ''}
          </span>
        </div>
      </div>

      {/* Liste groupée par user */}
      {loading ? (
        <div className="flex justify-center items-center h-40">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-teal-500 border-t-transparent"></div>
        </div>
      ) : grouped.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
          <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center text-3xl mx-auto mb-3">🔒</div>
          <p className="text-slate-600 font-bold">Aucune session</p>
          <p className="text-xs text-slate-400 mt-1">Aucune connexion active</p>
        </div>
      ) : (
        <div className="space-y-4">
          {grouped.map(([userId, group]) => {
            const user = group.user;
            const initial = (user?.name || user?.email || '?').charAt(0).toUpperCase();
            return (
              <div key={userId} className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                {/* User header */}
                <div className="bg-slate-50 px-5 py-3 border-b border-slate-200 flex items-center gap-3 flex-wrap">
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-teal-500 flex items-center justify-center text-white font-black text-sm shrink-0">
                    {initial}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-slate-900 text-sm truncate">
                        {user?.name || user?.email}
                      </span>
                      {user?.role && (
                        <span className="text-[9px] font-black tracking-widest px-1.5 py-0.5 rounded bg-slate-200 text-slate-700">
                          {user.role}
                        </span>
                      )}
                      {!user?.isActive && (
                        <span className="text-[9px] font-black tracking-widest px-1.5 py-0.5 rounded bg-red-100 text-red-700">
                          DÉSACTIVÉ
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-500 truncate">
                      {user?.email}
                      {user?.organization?.name && ` · ${user.organization.name}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[10px] font-black text-slate-500 bg-white border border-slate-200 px-2 py-0.5 rounded">
                      {group.sessions.length} session{group.sessions.length > 1 ? 's' : ''}
                    </span>
                    {group.sessions.length > 1 && (
                      <button
                        onClick={() => setRevokeAllTarget(group)}
                        className="text-[10px] font-black text-red-600 hover:bg-red-50 border border-red-200 px-2.5 py-1 rounded-lg transition"
                      >
                        Tout révoquer
                      </button>
                    )}
                  </div>
                </div>

                {/* Sessions du user */}
                <div className="divide-y divide-slate-100">
                  {group.sessions.map((s) => {
                    const ua = parseUserAgent(s.userAgent);
                    const isActive = s.isActive;
                    const isBusy = busy === s.id;

                    return (
                      <div key={s.id} className="px-5 py-3 flex items-center gap-3 hover:bg-slate-50/60">
                        <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-base shrink-0">
                          {deviceIcon(ua.device)}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                            <span className="text-sm font-bold text-slate-900">
                              {ua.browser} · {ua.os}
                            </span>
                            {isActive ? (
                              <span className="inline-flex items-center gap-1 text-[9px] font-black tracking-widest px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700">
                                <span className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse"></span>
                                ACTIVE
                              </span>
                            ) : (
                              <span className="text-[9px] font-black tracking-widest px-1.5 py-0.5 rounded bg-slate-200 text-slate-600">
                                RÉVOQUÉE
                              </span>
                            )}
                          </div>
                          <p className="text-[10px] text-slate-500">
                            {s.ipAddress || 'IP inconnue'}
                            {' · '}
                            Créée {timeAgo(s.createdAt)}
                            {isActive && ` · ${expiresIn(s.expiresAt)}`}
                          </p>
                        </div>

                        <div className="text-right shrink-0 hidden sm:block">
                          <p className="text-[10px] text-slate-500 tabular-nums">
                            {fmtDate(s.createdAt)} {fmtTime(s.createdAt)}
                          </p>
                          <p className="text-[10px] text-slate-400 truncate max-w-[200px]" title={s.userAgent || ''}>
                            {s.userAgent?.slice(0, 40) || '—'}
                          </p>
                        </div>

                        <div className="shrink-0">
                          {isActive && (
                            <button
                              onClick={() => setRevokeTarget(s)}
                              disabled={isBusy}
                              className="px-2.5 py-1 text-[10px] font-black text-red-600 hover:bg-red-50 border border-red-200 rounded-lg transition disabled:opacity-50"
                            >
                              {isBusy ? '...' : 'Révoquer'}
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Confirm revocation */}
      <ConfirmDialog
        open={!!revokeTarget}
        title="Révoquer cette session"
        message={`La session ${parseUserAgent(revokeTarget?.userAgent).browser} sera immédiatement déconnectée.`}
        onClose={() => setRevokeTarget(null)}
        onConfirm={doRevoke}
        isLoading={busy === revokeTarget?.id}
      />

      {/* Confirm revoke all */}
      <ConfirmDialog
        open={!!revokeAllTarget}
        title="Révoquer toutes les sessions"
        message={`Toutes les sessions de ${revokeAllTarget?.user?.name || revokeAllTarget?.user?.email} seront révoquées. L'utilisateur devra se reconnecter partout.`}
        onClose={() => setRevokeAllTarget(null)}
        onConfirm={doRevokeAll}
        isLoading={busy === revokeAllTarget?.user?.id}
      />
    </div>
  );
}
