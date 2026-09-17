'use client';

import { useState, useEffect, useMemo } from 'react';
import { apiFetch } from '../../../lib/api';

function humanSize(mo: number) {
  if (mo < 0.001) return { v: Math.round(mo * 1024 * 1024).toString(), u: 'o' };
  if (mo < 1) return { v: (mo * 1024).toFixed(1), u: 'Ko' };
  return { v: mo.toFixed(2), u: 'Mo' };
}
function formatBytes(b: number) {
  if (b < 1024) return { v: b.toFixed(0), u: 'o' };
  if (b < 1024 * 1024) return { v: (b / 1024).toFixed(1), u: 'Ko' };
  return { v: (b / 1024 / 1024).toFixed(2), u: 'Mo' };
}
function severity(pct: number) {
  if (pct >= 80) return { key: 'crit', label: 'CRITIQUE', color: '#dc2626', ring: 'stroke-red-500', bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-300' };
  if (pct >= 50) return { key: 'warn', label: 'ATTENTION', color: '#d97706', ring: 'stroke-amber-500', bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-300' };
  if (pct > 0) return { key: 'ok', label: 'NORMAL', color: '#059669', ring: 'stroke-emerald-500', bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-300' };
  return { key: 'idle', label: 'INACTIF', color: '#94a3b8', ring: 'stroke-slate-300', bg: 'bg-slate-50', text: 'text-slate-500', border: 'border-slate-200' };
}

function Gauge({ pct, size = 80 }: { pct: number; size?: number }) {
  const r = (size - 10) / 2;
  const c = 2 * Math.PI * r;
  const dash = (Math.min(pct, 100) / 100) * c;
  const sev = severity(pct);
  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth="6" className="stroke-slate-100" />
        <circle
          cx={size / 2} cy={size / 2} r={r}
          fill="none" strokeWidth="6" strokeLinecap="round"
          strokeDasharray={`${dash} ${c}`}
          style={{ stroke: sev.color, transition: 'stroke-dasharray 0.6s ease' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-sm font-black text-slate-900">{pct.toFixed(0)}%</span>
      </div>
    </div>
  );
}

interface Quota {
  id: string; organizationId: string; usedStorage: number; maxStorage: number;
  lastBackup: string | null; organization: { id: string; name: string };
}
interface BackupRow {
  id: string; organizationId: string; fileName: string; fileSize: number;
  status: string; createdAt: string; organization: { id: string; name: string };
}
type Alert = 'critical' | 'warning' | 'ok' | 'idle';

export default function StoragePage() {
  const [quotas, setQuotas] = useState<Quota[]>([]);
  const [backups, setBackups] = useState<BackupRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [alertFilter, setAlertFilter] = useState<Alert | 'all'>('all');
  const [detail, setDetail] = useState<Quota | null>(null);

  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : '';

  async function load() {
    const [q, b] = await Promise.all([
      apiFetch('/api/storage', { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()),
      apiFetch('/api/storage/backups', { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()),
    ]);
    setQuotas(Array.isArray(q) ? q : []);
    setBackups(Array.isArray(b) ? b : []);
  }

  useEffect(() => { load().catch(console.error).finally(() => setLoading(false)); }, []);

  function showToast(msg: string) { setToast(msg); setTimeout(() => setToast(null), 3000); }

  async function backupNow(orgId: string, name: string) {
    setBusy(orgId);
    const res = await apiFetch(`/api/storage/organization/${orgId}/backup`, {
      method: 'PATCH', headers: { Authorization: `Bearer ${token}` },
    });
    setBusy(null);
    showToast(res.ok ? `Sauvegarde creee : ${name}` : `Echec : ${name}`);
    if (res.ok) await load();
  }

  async function downloadBackup(id: string, fileName: string) {
    const res = await apiFetch(`/api/storage/backup/${id}/download`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) { showToast('Telechargement impossible'); return; }
    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = fileName || `backup-${id}.sql`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  }

  const stats = useMemo(() => {
    const totalUsedMo = quotas.reduce((s, r) => s + (r.usedStorage || 0), 0);
    const totalMaxMo = quotas.reduce((s, r) => s + (r.maxStorage || 0), 0);
    const critical = quotas.filter(r => r.maxStorage > 0 && (r.usedStorage / r.maxStorage) * 100 >= 80).length;
    const warning = quotas.filter(r => {
      const p = r.maxStorage > 0 ? (r.usedStorage / r.maxStorage) * 100 : 0;
      return p >= 50 && p < 80;
    }).length;
    const ok = quotas.filter(r => {
      const p = r.maxStorage > 0 ? (r.usedStorage / r.maxStorage) * 100 : 0;
      return p > 0 && p < 50;
    }).length;
    const idle = quotas.length - critical - warning - ok;
    const globalPct = totalMaxMo > 0 ? (totalUsedMo / totalMaxMo) * 100 : 0;
    const lastBackup = backups[0]?.createdAt || null;
    return { totalUsedMo, totalMaxMo, critical, warning, ok, idle, globalPct, lastBackup, totalBackups: backups.length };
  }, [quotas, backups]);

  const filtered = useMemo(() => {
    let list = [...quotas];
    if (alertFilter !== 'all') {
      list = list.filter(r => {
        const p = r.maxStorage > 0 ? (r.usedStorage / r.maxStorage) * 100 : 0;
        if (alertFilter === 'critical') return p >= 80;
        if (alertFilter === 'warning') return p >= 50 && p < 80;
        if (alertFilter === 'ok') return p > 0 && p < 50;
        if (alertFilter === 'idle') return p === 0;
        return true;
      });
    }
    return list.sort((a, b) => {
      const pa = a.maxStorage > 0 ? a.usedStorage / a.maxStorage : 0;
      const pb = b.maxStorage > 0 ? b.usedStorage / b.maxStorage : 0;
      return pb - pa;
    });
  }, [quotas, alertFilter]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-10 w-10 border-4 border-teal-400 border-t-transparent"></div>
      </div>
    );
  }

  const globalSev = severity(stats.globalPct);
  const hasAlerts = stats.critical > 0 || stats.warning > 0;

  return (
    <div className="space-y-5">
      {toast && (
        <div className="fixed top-20 right-4 z-[100] bg-slate-900 text-white px-4 py-3 rounded-xl shadow-2xl text-sm font-medium">
          {toast}
        </div>
      )}

      {/* Bandeau d'alerte (seulement si critique) */}
      {stats.critical > 0 && (
        <div className="bg-red-50 border-l-4 border-red-500 rounded-2xl px-5 py-4 flex items-start gap-4">
          <div className="w-10 h-10 rounded-full bg-red-500 text-white flex items-center justify-center font-black shrink-0">
            {stats.critical}
          </div>
          <div className="flex-1">
            <h3 className="font-black text-red-900 text-sm uppercase tracking-wider">
              {stats.critical} organisation{stats.critical > 1 ? 's' : ''} en surcharge
            </h3>
            <p className="text-xs text-red-700 mt-0.5">
              Ces tenants approchent de leur quota. Verifiez leur abonnement ou nettoyez leurs donnees.
            </p>
          </div>
          <button
            onClick={() => setAlertFilter('critical')}
            className="px-3 py-1.5 rounded-lg bg-red-500 text-white text-xs font-bold hover:bg-red-600 transition shrink-0"
          >
            Voir
          </button>
        </div>
      )}

      {/* Header style monitoring */}
      <div className="flex flex-col md:flex-row gap-4 items-start">
        <div className="flex-1">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Systeme de stockage</p>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">
            {humanSize(stats.totalUsedMo).v} <span className="text-xl text-slate-400 font-bold">{humanSize(stats.totalUsedMo).u}</span>
            <span className="text-slate-300 mx-2">/</span>
            <span className="text-slate-500 text-2xl">{(stats.totalMaxMo / 1000).toFixed(2)} Go</span>
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            {quotas.length} tenant{quotas.length > 1 ? 's' : ''} surveille{quotas.length > 1 ? 's' : ''} · {backups.length} sauvegarde{backups.length > 1 ? 's' : ''}
          </p>
        </div>

        {/* Grande jauge globale */}
        <div className={`flex items-center gap-4 px-6 py-4 rounded-2xl border-2 ${globalSev.border} ${globalSev.bg}`}>
          <Gauge pct={stats.globalPct} size={88} />
          <div>
            <p className={`text-[10px] font-black tracking-widest ${globalSev.text}`}>USAGE GLOBAL</p>
            <p className="text-2xl font-black text-slate-900">{stats.globalPct.toFixed(2)}%</p>
            <p className="text-[10px] text-slate-500 mt-0.5">
              Reste : {humanSize(stats.totalMaxMo - stats.totalUsedMo).v} {humanSize(stats.totalMaxMo - stats.totalUsedMo).u}
            </p>
          </div>
        </div>
      </div>

      {/* Alertes chips - pas des selects */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <button
          onClick={() => setAlertFilter(alertFilter === 'critical' ? 'all' : 'critical')}
          className={`text-left p-4 rounded-2xl border-2 transition ${alertFilter === 'critical' ? 'border-red-500 bg-red-50 shadow-md' : 'border-slate-200 bg-white hover:border-red-300'}`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500"></span>
            <span className="text-[10px] font-black tracking-widest text-red-600">CRITIQUE</span>
          </div>
          <p className="text-3xl font-black text-slate-900">{stats.critical}</p>
          <p className="text-[10px] text-slate-500 mt-0.5">usage &gt; 80%</p>
        </button>

        <button
          onClick={() => setAlertFilter(alertFilter === 'warning' ? 'all' : 'warning')}
          className={`text-left p-4 rounded-2xl border-2 transition ${alertFilter === 'warning' ? 'border-amber-500 bg-amber-50 shadow-md' : 'border-slate-200 bg-white hover:border-amber-300'}`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
            <span className="text-[10px] font-black tracking-widest text-amber-600">ATTENTION</span>
          </div>
          <p className="text-3xl font-black text-slate-900">{stats.warning}</p>
          <p className="text-[10px] text-slate-500 mt-0.5">usage 50-80%</p>
        </button>

        <button
          onClick={() => setAlertFilter(alertFilter === 'ok' ? 'all' : 'ok')}
          className={`text-left p-4 rounded-2xl border-2 transition ${alertFilter === 'ok' ? 'border-emerald-500 bg-emerald-50 shadow-md' : 'border-slate-200 bg-white hover:border-emerald-300'}`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
            <span className="text-[10px] font-black tracking-widest text-emerald-600">NORMAL</span>
          </div>
          <p className="text-3xl font-black text-slate-900">{stats.ok}</p>
          <p className="text-[10px] text-slate-500 mt-0.5">usage 0-50%</p>
        </button>

        <button
          onClick={() => setAlertFilter(alertFilter === 'idle' ? 'all' : 'idle')}
          className={`text-left p-4 rounded-2xl border-2 transition ${alertFilter === 'idle' ? 'border-slate-500 bg-slate-50 shadow-md' : 'border-slate-200 bg-white hover:border-slate-400'}`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="w-2.5 h-2.5 rounded-full bg-slate-400"></span>
            <span className="text-[10px] font-black tracking-widest text-slate-500">INACTIF</span>
          </div>
          <p className="text-3xl font-black text-slate-900">{stats.idle}</p>
          <p className="text-[10px] text-slate-500 mt-0.5">aucune donnee</p>
        </button>
      </div>

      {/* Titre section + reset */}
      <div className="flex items-center justify-between pt-2">
        <h2 className="text-sm font-black text-slate-700 uppercase tracking-widest">
          {alertFilter === 'all' ? 'Tous les tenants' : alertFilter === 'critical' ? 'Tenants critiques' : alertFilter === 'warning' ? 'Tenants en attention' : alertFilter === 'ok' ? 'Tenants normaux' : 'Tenants inactifs'}
        </h2>
        <div className="flex items-center gap-3">
          {alertFilter !== 'all' && (
            <button onClick={() => setAlertFilter('all')} className="text-xs font-bold text-teal-600 hover:underline">
              Reinitialiser le filtre
            </button>
          )}
          <span className="text-xs text-slate-400 font-bold">{filtered.length} résultat{filtered.length > 1 ? 's' : ''}</span>
        </div>
      </div>

      {/* Lignes de monitoring compactes */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border-2 border-dashed border-slate-200 p-12 text-center">
          <p className="text-slate-500 font-bold">Aucun tenant dans cette categorie</p>
          <p className="text-xs text-slate-400 mt-1">Modifiez le filtre pour voir plus de resultats</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(r => {
            const pct = r.maxStorage > 0 ? (r.usedStorage / r.maxStorage) * 100 : 0;
            const sev = severity(pct);
            const used = humanSize(r.usedStorage);
            const barWidth = Math.max(pct, 0.5);
            const isBk = busy === r.organizationId;
            return (
              <div key={r.id} className={`bg-white rounded-2xl border-l-4 ${sev.key === 'crit' ? 'border-red-500' : sev.key === 'warn' ? 'border-amber-500' : sev.key === 'ok' ? 'border-emerald-500' : 'border-slate-200'} border-y border-r border-slate-100 hover:shadow-md transition`}>
                <div className="flex items-center gap-4 p-4">
                  {/* Avatar + nom */}
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center font-black text-white shrink-0" style={{ background: sev.color }}>
                      {r.organization?.name?.charAt(0).toUpperCase() || '?'}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-slate-900 text-sm truncate">{r.organization?.name}</p>
                      <p className="text-[10px] text-slate-400 font-mono truncate">{r.organizationId.slice(0, 16)}</p>
                    </div>
                  </div>

                  {/* Barre + valeurs */}
                  <div className="hidden md:block flex-1 max-w-md">
                    <div className="flex items-center justify-between text-[10px] font-bold mb-1">
                      <span className="text-slate-500">
                        {used.v} <span className="text-slate-400">{used.u}</span> / {r.maxStorage.toLocaleString('fr-FR')} Mo
                      </span>
                      <span className={sev.text}>{pct.toFixed(2)}%</span>
                    </div>
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{ width: `${barWidth}%`, background: sev.color }}
                      ></div>
                    </div>
                  </div>

                  {/* Badge statut */}
                  <div className="hidden lg:block shrink-0">
                    <span className="text-[10px] font-black tracking-widest px-2.5 py-1 rounded-lg" style={{ background: `${sev.color}15`, color: sev.color }}>
                      {sev.label}
                    </span>
                  </div>

                  {/* Backup date */}
                  <div className="hidden xl:block text-right shrink-0 w-32">
                    <p className="text-[10px] text-slate-400 uppercase font-bold">Backup</p>
                    {r.lastBackup ? (
                      <p className="text-xs font-bold text-slate-700">
                        {new Date(r.lastBackup).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })}
                        <span className="text-slate-400 ml-1">{new Date(r.lastBackup).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</span>
                      </p>
                    ) : (
                      <p className="text-xs font-bold text-slate-300 italic">Jamais</p>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={() => backupNow(r.organizationId, r.organization?.name || '')}
                      disabled={isBk}
                      className="px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-900 text-white hover:bg-slate-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isBk ? 'En cours' : 'Sauvegarder'}
                    </button>
                    <button
                      onClick={() => setDetail(r)}
                      className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition"
                      title="Details"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"/>
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Section Historique backups compacte */}
      {backups.length > 0 && (
        <div className="pt-4">
          <h2 className="text-sm font-black text-slate-700 uppercase tracking-widest mb-3">
            Dernieres sauvegardes ({backups.length})
          </h2>
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
            <div className="max-h-64 overflow-y-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 sticky top-0">
                  <tr>
                    <th className="px-4 py-2 font-bold text-slate-500 uppercase tracking-wider text-[10px]">Organisation</th>
                    <th className="px-4 py-2 font-bold text-slate-500 uppercase tracking-wider text-[10px] hidden sm:table-cell">Fichier</th>
                    <th className="px-4 py-2 font-bold text-slate-500 uppercase tracking-wider text-[10px] text-right">Taille</th>
                    <th className="px-4 py-2 font-bold text-slate-500 uppercase tracking-wider text-[10px] hidden md:table-cell">Date</th>
                    <th className="px-4 py-2 font-bold text-slate-500 uppercase tracking-wider text-[10px] text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {backups.slice(0, 30).map(b => {
                    const sz = formatBytes(b.fileSize);
                    return (
                      <tr key={b.id} className="hover:bg-slate-50">
                        <td className="px-4 py-2 font-semibold text-slate-900">{b.organization?.name}</td>
                        <td className="px-4 py-2 text-slate-500 font-mono text-[10px] truncate max-w-[180px] hidden sm:table-cell">{b.fileName}</td>
                        <td className="px-4 py-2 text-right font-bold text-slate-900 whitespace-nowrap">
                          {sz.v} <span className="text-slate-400 font-medium">{sz.u}</span>
                        </td>
                        <td className="px-4 py-2 text-slate-500 hidden md:table-cell whitespace-nowrap">
                          {new Date(b.createdAt).toLocaleDateString('fr-FR')} {new Date(b.createdAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                        </td>
                        <td className="px-4 py-2 text-center">
                          <button
                            onClick={() => downloadBackup(b.id, b.fileName)}
                            className="text-blue-600 hover:underline font-bold text-[11px]"
                          >
                            Telecharger
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Drawer detail */}
      {detail && (
        <div className="fixed inset-0 z-[100] flex justify-end">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setDetail(null)}></div>
          <div className="relative w-full max-w-md bg-white shadow-2xl h-full overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between z-10">
              <h2 className="font-black text-slate-900 text-lg">Details du tenant</h2>
              <button onClick={() => setDetail(null)} className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-500 transition">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"/>
                </svg>
              </button>
            </div>
            <div className="p-6 space-y-6">
              {(() => {
                const pct = detail.maxStorage > 0 ? (detail.usedStorage / detail.maxStorage) * 100 : 0;
                const sev = severity(pct);
                const used = humanSize(detail.usedStorage);
                return (
                  <>
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-2xl font-black text-white" style={{ background: sev.color }}>
                        {detail.organization?.name?.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <h3 className="font-black text-slate-900 text-lg">{detail.organization?.name}</h3>
                        <p className="text-xs text-slate-400 font-mono">{detail.organizationId}</p>
                      </div>
                    </div>

                    <div className={`p-4 rounded-2xl border-2 ${sev.border} ${sev.bg}`}>
                      <div className="flex items-center justify-between mb-2">
                        <span className={`text-xs font-black tracking-widest ${sev.text}`}>USAGE</span>
                        <span className="text-2xl font-black text-slate-900">{pct.toFixed(2)}%</span>
                      </div>
                      <div className="h-3 bg-white rounded-full overflow-hidden border border-slate-200">
                        <div className="h-full rounded-full" style={{ width: `${Math.max(pct, 0.5)}%`, background: sev.color }}></div>
                      </div>
                      <div className="flex justify-between text-xs mt-3 font-bold">
                        <span className="text-slate-700">{used.v} {used.u} utilise</span>
                        <span className="text-slate-400">sur {detail.maxStorage.toLocaleString('fr-FR')} Mo</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-slate-50 rounded-xl p-3">
                        <p className="text-[10px] text-slate-500 uppercase font-black tracking-wider mb-1">Quota max</p>
                        <p className="text-lg font-black text-slate-900">{detail.maxStorage.toLocaleString('fr-FR')} Mo</p>
                      </div>
                      <div className="bg-slate-50 rounded-xl p-3">
                        <p className="text-[10px] text-slate-500 uppercase font-black tracking-wider mb-1">Reste</p>
                        <p className="text-lg font-black text-slate-900">
                          {humanSize(detail.maxStorage - detail.usedStorage).v} {humanSize(detail.maxStorage - detail.usedStorage).u}
                        </p>
                      </div>
                    </div>

                    <div>
                      <p className="text-[10px] text-slate-500 uppercase font-black tracking-wider mb-2">Derniere sauvegarde</p>
                      {detail.lastBackup ? (
                        <p className="text-sm font-bold text-slate-700">
                          {new Date(detail.lastBackup).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })}
                          {' a '}
                          {new Date(detail.lastBackup).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      ) : (
                        <p className="text-sm font-bold text-slate-300 italic">Jamais sauvegarde</p>
                      )}
                    </div>

                    <button
                      onClick={() => { backupNow(detail.organizationId, detail.organization?.name || ''); setDetail(null); }}
                      className="w-full py-3 rounded-xl bg-gradient-to-r from-blue-600 to-teal-500 text-white font-black shadow-lg hover:shadow-xl transition"
                    >
                      Sauvegarder maintenant
                    </button>
                  </>
                );
              })()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
