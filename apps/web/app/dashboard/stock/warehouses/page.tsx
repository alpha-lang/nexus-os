'use client';

import { useState, useEffect } from 'react';
import { apiFetch, unwrap } from '../../../../lib/api';
import { Button } from '../../../../components/ui';

export default function WarehousesPage() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<any>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : '';

  async function load() {
    const res = await apiFetch('/api/stock/warehouses/stats', {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    setStats(data);
  }

  async function openDetail(id: string) {
    setSelectedId(id);
    setDetailLoading(true);
    const res = await apiFetch(`/api/stock/warehouses/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    setDetail(await res.json());
    setDetailLoading(false);
  }

  function closeDetail() {
    setSelectedId(null);
    setDetail(null);
  }

  useEffect(() => {
    load().catch(console.error).finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-10 w-10 border-4 border-teal-400 border-t-transparent"></div>
      </div>
    );
  }

  const summary = stats?.summary || {};

  return (
    <div className="space-y-5 max-w-7xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <p className="text-xs font-black text-teal-600 uppercase tracking-widest mb-1">Réseau logistique</p>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Magasins</h1>
          <p className="text-slate-500 mt-1">
            {summary.totalWarehouses || 0} emplacement{(summary.totalWarehouses || 0) > 1 ? 's' : ''} de stockage ·{' '}
            <span className="font-bold text-slate-900">{(summary.totalValue || 0).toLocaleString('fr-FR')} Ar</span> de stock
          </p>
        </div>
        <a
          href="/dashboard/stock"
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-white border-2 border-slate-300 rounded-xl text-sm font-semibold text-slate-700 hover:bg-slate-900 hover:text-white hover:border-slate-900 transition"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Retour stock
        </a>
      </div>

      {/* KPI global */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-slate-900 rounded-2xl p-5 text-white">
          <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest mb-1">Magasins</p>
          <p className="text-2xl font-black tabular-nums text-teal-400">{summary.totalWarehouses || 0}</p>
          <p className="text-[10px] text-slate-500 mt-0.5">emplacements actifs</p>
        </div>
        <div className="bg-white rounded-2xl p-5 border border-slate-200">
          <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest mb-1">Valeur totale</p>
          <p className="text-2xl font-black text-slate-900 tabular-nums">{(summary.totalValue || 0).toLocaleString('fr-FR')}</p>
          <p className="text-[10px] text-slate-400 mt-0.5">Ar sur tout le réseau</p>
        </div>
        <div className="bg-white rounded-2xl p-5 border border-slate-200">
          <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest mb-1">Références</p>
          <p className="text-2xl font-black text-slate-900 tabular-nums">{summary.totalArticles || 0}</p>
          <p className="text-[10px] text-slate-400 mt-0.5">articles stockés</p>
        </div>
        <div className={`rounded-2xl p-5 border ${(summary.totalAlerts || 0) > 0 ? 'bg-red-50 border-red-200' : 'bg-emerald-50 border-emerald-200'}`}>
          <p className={`text-[10px] uppercase font-black tracking-widest mb-1 ${(summary.totalAlerts || 0) > 0 ? 'text-red-700' : 'text-emerald-700'}`}>
            Alertes
          </p>
          <p className={`text-2xl font-black tabular-nums ${(summary.totalAlerts || 0) > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
            {summary.totalAlerts || 0}
          </p>
          <p className={`text-[10px] mt-0.5 ${(summary.totalAlerts || 0) > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
            sous le seuil minimum
          </p>
        </div>
      </div>

      {/* Grille magasins */}
      {(!stats?.warehouses || stats.warehouses.length === 0) ? (
        <div className="bg-white rounded-2xl border-2 border-dashed border-slate-200 p-16 text-center">
          <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center text-3xl mx-auto mb-3">🏬</div>
          <p className="text-lg font-bold text-slate-700 mb-1">Aucun magasin</p>
          <p className="text-sm text-slate-400 mb-4">Créez votre premier emplacement de stockage</p>
          <a
            href="/dashboard/stock"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-linear-to-r from-blue-600 to-teal-500 text-white rounded-xl font-semibold hover:shadow-lg transition"
          >
            + Créer un magasin
          </a>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {stats.warehouses.map((w: any) => {
            const hasAlerts = w.alertsCount > 0;
            const isEmpty = w.totalArticles === 0;
            return (
              <button
                key={w.id}
                onClick={() => openDetail(w.id)}
                className={'text-left bg-white rounded-2xl border-2 overflow-hidden transition hover:shadow-lg hover:-translate-y-0.5 ' + (
                  hasAlerts ? 'border-amber-300' : w.isDefault ? 'border-teal-300' : 'border-slate-200'
                )}
              >
                {/* Header */}
                <div className="flex items-center gap-3 p-4 border-b border-slate-100">
                  <div className={'w-12 h-12 rounded-xl flex items-center justify-center font-black text-white text-sm shadow-md shrink-0 ' + (
                    hasAlerts ? 'bg-gradient-to-br from-amber-500 to-orange-600' :
                    w.isDefault ? 'bg-gradient-to-br from-teal-500 to-emerald-600' :
                    'bg-gradient-to-br from-slate-500 to-slate-700'
                  )}>
                    {w.code.slice(0, 2)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-0.5">
                      <h3 className="font-black text-slate-900 text-sm truncate">{w.name}</h3>
                      {w.isDefault && (
                        <span className="text-[9px] font-black tracking-widest px-1.5 py-0.5 rounded bg-teal-100 text-teal-700">DÉFAUT</span>
                      )}
                      {hasAlerts && (
                        <span className="text-[9px] font-black tracking-widest px-1.5 py-0.5 rounded bg-red-100 text-red-700">
                          {w.alertsCount} ALERTE{w.alertsCount > 1 ? 'S' : ''}
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] text-slate-400 font-mono truncate">
                      {w.code}{w.location ? ` · ${w.location}` : ''}
                    </p>
                  </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 divide-x divide-slate-100 border-b border-slate-100">
                  <div className="p-3 text-center">
                    <p className="text-[9px] text-slate-400 uppercase font-black tracking-widest">Valeur</p>
                    <p className="text-base font-black text-slate-900 tabular-nums mt-0.5">
                      {w.totalValue.toLocaleString('fr-FR')}
                      <span className="text-[10px] text-slate-400 ml-0.5">Ar</span>
                    </p>
                  </div>
                  <div className="p-3 text-center">
                    <p className="text-[9px] text-slate-400 uppercase font-black tracking-widest">Références</p>
                    <p className="text-base font-black text-slate-900 tabular-nums mt-0.5">{w.totalArticles}</p>
                  </div>
                </div>

                {/* Alerts preview */}
                {w.topAlerts.length > 0 && (
                  <div className="p-3 bg-red-50/50 border-b border-red-100">
                    <p className="text-[9px] text-red-700 uppercase font-black tracking-widest mb-1.5">Stock bas</p>
                    <div className="space-y-0.5">
                      {w.topAlerts.map((a: any) => (
                        <div key={a.id} className="flex justify-between text-[11px]">
                          <span className="text-red-800 truncate">{a.name}</span>
                          <span className="font-bold text-red-700 tabular-nums ml-2 shrink-0">
                            {a.quantity}/{a.minStock} {a.unit}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Footer */}
                <div className="px-4 py-2.5 bg-slate-50/50 flex items-center justify-between">
                  <span className="text-[10px] text-slate-400">
                    {w.movements30d} mvt{w.movements30d > 1 ? 's' : ''} 30j
                  </span>
                  {isEmpty ? (
                    <span className="text-[10px] font-bold text-slate-400 italic">Vide</span>
                  ) : (
                    <span className="text-[10px] font-black text-teal-600">Voir le détail →</span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* Drawer détail */}
      {selectedId && (
        <div className="fixed inset-0 z-[100] flex justify-end">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={closeDetail}></div>
          <div className="relative w-full max-w-3xl bg-white shadow-2xl h-full overflow-y-auto">
            {detailLoading ? (
              <div className="flex justify-center items-center h-full">
                <div className="animate-spin rounded-full h-10 w-10 border-4 border-teal-400 border-t-transparent"></div>
              </div>
            ) : !detail ? null : (
              <>
                {/* Header */}
                <div className="sticky top-0 z-10 bg-gradient-to-r from-slate-900 via-blue-900 to-teal-900 px-6 py-5 text-white">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 rounded-2xl bg-white/15 backdrop-blur flex items-center justify-center font-black text-lg border border-white/20 shrink-0">
                        {detail.warehouse.code.slice(0, 2)}
                      </div>
                      <div>
                        <h2 className="text-2xl font-black">{detail.warehouse.name}</h2>
                        <p className="text-xs text-blue-200 mt-0.5 font-mono">
                          {detail.warehouse.code}{detail.warehouse.location ? ` · ${detail.warehouse.location}` : ''}
                          {detail.warehouse.isDefault && ' · PAR DÉFAUT'}
                        </p>
                      </div>
                    </div>
                    <button onClick={closeDetail} className="w-9 h-9 rounded-full bg-white/15 hover:bg-white/25 flex items-center justify-center text-xl transition shrink-0">×</button>
                  </div>

                  <div className="grid grid-cols-4 gap-2 mt-4">
                    <div className="bg-white/10 rounded-xl px-3 py-2 border border-white/20">
                      <p className="text-[9px] text-blue-200 uppercase font-black tracking-widest">Valeur</p>
                      <p className="text-base font-black tabular-nums">{detail.summary.totalValue.toLocaleString('fr-FR')}</p>
                    </div>
                    <div className="bg-white/10 rounded-xl px-3 py-2 border border-white/20">
                      <p className="text-[9px] text-blue-200 uppercase font-black tracking-widest">Références</p>
                      <p className="text-base font-black tabular-nums">{detail.summary.totalArticles}</p>
                    </div>
                    <div className="bg-white/10 rounded-xl px-3 py-2 border border-white/20">
                      <p className="text-[9px] text-blue-200 uppercase font-black tracking-widest">Quantité</p>
                      <p className="text-base font-black tabular-nums">{detail.summary.totalQty}</p>
                    </div>
                    <div className={'rounded-xl px-3 py-2 border ' + (detail.summary.alertsCount > 0 ? 'bg-red-500/20 border-red-400/40' : 'bg-emerald-500/20 border-emerald-400/40')}>
                      <p className="text-[9px] text-white/80 uppercase font-black tracking-widest">Alertes</p>
                      <p className="text-base font-black tabular-nums">{detail.summary.alertsCount}</p>
                    </div>
                  </div>
                </div>

                <div className="p-6 space-y-6">
                  {/* Articles */}
                  <div>
                    <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-3">
                      Articles ({detail.items.filter((i: any) => i.quantity > 0).length})
                    </h3>
                    {detail.items.filter((i: any) => i.quantity > 0).length === 0 ? (
                      <div className="bg-slate-50 rounded-2xl p-8 text-center">
                        <p className="text-sm text-slate-400">Aucun article dans ce magasin</p>
                      </div>
                    ) : (
                      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                        <div className="overflow-x-auto">
                          <table className="w-full text-left text-sm">
                            <thead className="bg-slate-50 border-b border-slate-200">
                              <tr>
                                <th className="p-3 text-[10px] font-black text-slate-500 uppercase tracking-wider">Article</th>
                                <th className="p-3 text-[10px] font-black text-slate-500 uppercase tracking-wider text-right">Quantité</th>
                                <th className="p-3 text-[10px] font-black text-slate-500 uppercase tracking-wider text-right">Valeur</th>
                                <th className="p-3 text-[10px] font-black text-slate-500 uppercase tracking-wider text-center">Statut</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {detail.items.filter((i: any) => i.quantity > 0).map((it: any) => {
                                const statusMeta: Record<string, any> = {
                                  OK: { label: 'OK', bg: 'bg-emerald-100', text: 'text-emerald-700' },
                                  CRITICAL: { label: 'CRITIQUE', bg: 'bg-amber-100', text: 'text-amber-700' },
                                  OUT: { label: 'RUPTURE', bg: 'bg-red-100', text: 'text-red-700' },
                                  OVER: { label: 'SURSTOCK', bg: 'bg-purple-100', text: 'text-purple-700' },
                                };
                                const sm = statusMeta[it.status] || statusMeta.OK;
                                return (
                                  <tr key={it.id} className="hover:bg-slate-50">
                                    <td className="p-3">
                                      <p className="font-bold text-slate-900 text-sm">{it.name}</p>
                                      <p className="text-[10px] text-slate-400 font-mono">
                                        {it.sku || '—'} · min {it.minStock} {it.unit}
                                      </p>
                                    </td>
                                    <td className="p-3 text-right">
                                      <span className="font-black text-slate-900 tabular-nums">{it.quantity}</span>
                                      <span className="text-[10px] text-slate-400 ml-1">{it.unit}</span>
                                    </td>
                                    <td className="p-3 text-right font-bold text-slate-900 tabular-nums">
                                      {it.value.toLocaleString('fr-FR')} <span className="text-[10px] text-slate-400">Ar</span>
                                    </td>
                                    <td className="p-3 text-center">
                                      <span className={'inline-flex text-[9px] font-black tracking-widest px-2 py-0.5 rounded-md ' + sm.bg + ' ' + sm.text}>
                                        {sm.label}
                                      </span>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Mouvements récents */}
                  <div>
                    <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-3">
                      Mouvements récents ({detail.recentMovements.length})
                    </h3>
                    {detail.recentMovements.length === 0 ? (
                      <div className="bg-slate-50 rounded-2xl p-8 text-center">
                        <p className="text-sm text-slate-400">Aucun mouvement</p>
                      </div>
                    ) : (
                      <div className="space-y-1.5">
                        {detail.recentMovements.map((m: any) => {
                          const isOut = m.quantity < 0;
                          return (
                            <div key={m.id} className="flex items-center gap-3 p-3 bg-white rounded-xl border border-slate-200">
                              <div className={'w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ' + (isOut ? 'bg-red-100 text-red-600' : 'bg-emerald-100 text-emerald-600')}>
                                {isOut ? '↓' : '↑'}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-bold text-slate-900 truncate">{m.item?.name}</p>
                                <p className="text-[10px] text-slate-400 truncate">
                                  {m.type} · {m.reason || 'sans motif'}
                                  {m.user && ` · par ${m.user.name || m.user.email}`}
                                </p>
                              </div>
                              <div className="text-right shrink-0">
                                <p className={'font-black tabular-nums text-sm ' + (isOut ? 'text-red-600' : 'text-emerald-600')}>
                                  {isOut ? '' : '+'}{m.quantity} <span className="text-[10px]">{m.item?.unit}</span>
                                </p>
                                <p className="text-[10px] text-slate-400">
                                  {new Date(m.createdAt).toLocaleDateString('fr-FR')}
                                </p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
