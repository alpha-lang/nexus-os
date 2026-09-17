'use client';

import { useState, useEffect, useMemo } from 'react';
import { apiFetch } from '../../../../lib/api';

type Tab = 'rotation' | 'abc' | 'prices';

const ABC_META: Record<string, { color: string; bg: string; text: string }> = {
  A: { color: '#059669', bg: 'bg-emerald-100', text: 'text-emerald-700' },
  B: { color: '#d97706', bg: 'bg-amber-100',   text: 'text-amber-700' },
  C: { color: '#64748b', bg: 'bg-slate-100',   text: 'text-slate-700' },
};

export default function ReportsPage() {
  const [tab, setTab] = useState<Tab>('rotation');
  const [days, setDays] = useState(30);
  const [rotation, setRotation] = useState<any[]>([]);
  const [abc, setAbc] = useState<any[]>([]);
  const [prices, setPrices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : '';

  async function load() {
    setLoading(true);
    const [r, a, p] = await Promise.all([
      apiFetch(`/api/stock/reports/rotation?days=${days}`, { headers: { Authorization: `Bearer ${token}` } }).then(x => x.json()),
      apiFetch(`/api/stock/reports/abc?days=${days}`, { headers: { Authorization: `Bearer ${token}` } }).then(x => x.json()),
      apiFetch('/api/stock/reports/price-history', { headers: { Authorization: `Bearer ${token}` } }).then(x => x.json()),
    ]);
    setRotation(Array.isArray(r) ? r : []);
    setAbc(Array.isArray(a) ? a : []);
    setPrices(Array.isArray(p) ? p : []);
    setLoading(false);
  }

  useEffect(() => { load().catch(console.error); }, [days]);

  const abcTotals = useMemo(() => ({
    a: abc.filter(x => x.class === 'A').length,
    b: abc.filter(x => x.class === 'B').length,
    c: abc.filter(x => x.class === 'C').length,
  }), [abc]);

  const rotationStats = useMemo(() => ({
    active: rotation.filter(r => r.rotation > 0).length,
    dormant: rotation.filter(r => r.rotation === 0 && r.currentStock > 0).length,
    avgRotation: rotation.length > 0 ? Math.round(rotation.reduce((s, r) => s + r.rotation, 0) / rotation.length * 100) / 100 : 0,
  }), [rotation]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-10 w-10 border-4 border-teal-400 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <p className="text-xs font-black text-teal-600 uppercase tracking-widest mb-1">Intelligence</p>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Rapports stock</h1>
          <p className="text-slate-500 mt-1">Rotation, analyse ABC et historique des prix</p>
        </div>
        <div className="flex gap-2 items-center">
          <select value={days} onChange={e => setDays(parseInt(e.target.value))} className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-900 cursor-pointer">
            <option value={7}>7 jours</option>
            <option value={30}>30 jours</option>
            <option value={90}>90 jours</option>
            <option value={180}>180 jours</option>
          </select>
          <a href="/dashboard/stock" className="inline-flex items-center gap-2 px-4 py-2.5 bg-white border-2 border-slate-300 rounded-xl text-sm font-semibold text-slate-700 hover:bg-slate-900 hover:text-white hover:border-slate-900 transition whitespace-nowrap">
            Retour stock
          </a>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-1 flex gap-1 overflow-x-auto">
        <button onClick={() => setTab('rotation')} className={'px-4 py-2 rounded-xl text-sm font-bold transition whitespace-nowrap ' + (tab === 'rotation' ? 'bg-linear-to-r from-blue-600 to-teal-500 text-white shadow' : 'text-slate-600 hover:bg-slate-50')}>
          Rotation ({rotation.length})
        </button>
        <button onClick={() => setTab('abc')} className={'px-4 py-2 rounded-xl text-sm font-bold transition whitespace-nowrap ' + (tab === 'abc' ? 'bg-linear-to-r from-blue-600 to-teal-500 text-white shadow' : 'text-slate-600 hover:bg-slate-50')}>
          Analyse ABC ({abc.length})
        </button>
        <button onClick={() => setTab('prices')} className={'px-4 py-2 rounded-xl text-sm font-bold transition whitespace-nowrap ' + (tab === 'prices' ? 'bg-linear-to-r from-blue-600 to-teal-500 text-white shadow' : 'text-slate-600 hover:bg-slate-50')}>
          Historique prix ({prices.length})
        </button>
      </div>

      {tab === 'rotation' && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="bg-slate-900 rounded-2xl p-4 text-white">
              <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest mb-1">Rotation moyenne</p>
              <p className="text-2xl font-black text-teal-400 tabular-nums">{rotationStats.avgRotation}</p>
              <p className="text-[10px] text-slate-500 mt-0.5">sur {days} jours</p>
            </div>
            <div className="bg-white rounded-2xl p-4 border border-slate-200">
              <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest mb-1">Actifs</p>
              <p className="text-2xl font-black text-emerald-600 tabular-nums">{rotationStats.active}</p>
              <p className="text-[10px] text-slate-400 mt-0.5">articles avec consommation</p>
            </div>
            <div className="bg-white rounded-2xl p-4 border border-slate-200">
              <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest mb-1">Dormants</p>
              <p className="text-2xl font-black text-amber-600 tabular-nums">{rotationStats.dormant}</p>
              <p className="text-[10px] text-slate-400 mt-0.5">stock sans mouvement</p>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="p-3 font-black text-slate-600 text-[10px] uppercase tracking-wider">Article</th>
                    <th className="p-3 font-black text-slate-600 text-[10px] uppercase tracking-wider text-right">Stock</th>
                    <th className="p-3 font-black text-slate-600 text-[10px] uppercase tracking-wider text-right">Consomme</th>
                    <th className="p-3 font-black text-slate-600 text-[10px] uppercase tracking-wider text-right hidden md:table-cell">Moy/j</th>
                    <th className="p-3 font-black text-slate-600 text-[10px] uppercase tracking-wider text-right hidden lg:table-cell">Jours restants</th>
                    <th className="p-3 font-black text-slate-600 text-[10px] uppercase tracking-wider text-center">Rotation</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {rotation.map(r => (
                    <tr key={r.id} className="hover:bg-slate-50">
                      <td className="p-3">
                        <div className="font-bold text-slate-900">{r.name}</div>
                        <div className="text-[10px] text-slate-400 font-mono">{r.sku || '—'} {r.supplier && '· ' + r.supplier}</div>
                      </td>
                      <td className="p-3 text-right tabular-nums">
                        <span className="font-bold text-slate-900">{r.currentStock}</span>
                        <span className="text-xs text-slate-400 ml-1">{r.unit}</span>
                      </td>
                      <td className="p-3 text-right tabular-nums">
                        <span className={r.consumed > 0 ? 'font-bold text-slate-900' : 'text-slate-300'}>
                          {r.consumed.toLocaleString('fr-FR')}
                        </span>
                        <span className="text-xs text-slate-400 ml-1">{r.unit}</span>
                      </td>
                      <td className="p-3 text-right text-slate-600 tabular-nums hidden md:table-cell">{r.dailyAvg}</td>
                      <td className="p-3 text-right tabular-nums hidden lg:table-cell">
                        {r.daysLeft != null ? (
                          <span className={'font-bold ' + (r.daysLeft < 3 ? 'text-red-600' : r.daysLeft < 7 ? 'text-amber-600' : 'text-slate-700')}>
                            {r.daysLeft}j
                          </span>
                        ) : (
                          <span className="text-slate-300 italic">∞</span>
                        )}
                      </td>
                      <td className="p-3 text-center">
                        <span className={'inline-block text-xs font-black px-2 py-1 rounded-md ' + (
                          r.rotation >= 2 ? 'bg-emerald-100 text-emerald-700' :
                          r.rotation >= 0.5 ? 'bg-amber-100 text-amber-700' :
                          r.rotation > 0 ? 'bg-slate-100 text-slate-600' :
                          'bg-slate-100 text-slate-400'
                        )}>
                          {r.rotation}x
                        </span>
                      </td>
                    </tr>
                  ))}
                  {rotation.length === 0 && (
                    <tr><td colSpan={6} className="p-12 text-center text-slate-400 font-bold">Aucune donnee</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {tab === 'abc' && (
        <>
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-emerald-50 rounded-2xl p-4 border-2 border-emerald-300">
              <p className="text-[10px] text-emerald-700 uppercase font-black tracking-widest mb-1">Classe A</p>
              <p className="text-2xl font-black text-emerald-700 tabular-nums">{abcTotals.a}</p>
              <p className="text-[10px] text-emerald-600 mt-0.5">top 80% valeur</p>
            </div>
            <div className="bg-amber-50 rounded-2xl p-4 border-2 border-amber-300">
              <p className="text-[10px] text-amber-700 uppercase font-black tracking-widest mb-1">Classe B</p>
              <p className="text-2xl font-black text-amber-700 tabular-nums">{abcTotals.b}</p>
              <p className="text-[10px] text-amber-600 mt-0.5">milieu 15%</p>
            </div>
            <div className="bg-slate-50 rounded-2xl p-4 border-2 border-slate-300">
              <p className="text-[10px] text-slate-700 uppercase font-black tracking-widest mb-1">Classe C</p>
              <p className="text-2xl font-black text-slate-700 tabular-nums">{abcTotals.c}</p>
              <p className="text-[10px] text-slate-600 mt-0.5">queue 5%</p>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="p-3 font-black text-slate-600 text-[10px] uppercase tracking-wider">Classe</th>
                    <th className="p-3 font-black text-slate-600 text-[10px] uppercase tracking-wider">Article</th>
                    <th className="p-3 font-black text-slate-600 text-[10px] uppercase tracking-wider text-right">Valeur consommee</th>
                    <th className="p-3 font-black text-slate-600 text-[10px] uppercase tracking-wider text-right">%</th>
                    <th className="p-3 font-black text-slate-600 text-[10px] uppercase tracking-wider text-right">Cumul</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {abc.map(r => {
                    const meta = ABC_META[r.class];
                    return (
                      <tr key={r.id} className="hover:bg-slate-50">
                        <td className="p-3">
                          <span className={'inline-flex items-center justify-center w-8 h-8 rounded-lg font-black text-sm ' + meta.bg + ' ' + meta.text}>
                            {r.class}
                          </span>
                        </td>
                        <td className="p-3">
                          <div className="font-bold text-slate-900">{r.name}</div>
                          <div className="text-[10px] text-slate-400 font-mono">{r.sku || '—'}</div>
                        </td>
                        <td className="p-3 text-right font-bold text-slate-900 tabular-nums">
                          {r.value.toLocaleString('fr-FR')} Ar
                        </td>
                        <td className="p-3 text-right text-slate-600 tabular-nums">{r.pct.toFixed(1)}%</td>
                        <td className="p-3 text-right tabular-nums">
                          <div className="inline-flex items-center gap-2 justify-end">
                            <div className="w-20 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                              <div className="h-full rounded-full" style={{ width: Math.min(r.cumulativePct, 100) + '%', background: meta.color }}></div>
                            </div>
                            <span className="text-xs font-bold text-slate-700 w-12 text-right">{r.cumulativePct}%</span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {abc.length === 0 && (
                    <tr><td colSpan={5} className="p-12 text-center text-slate-400 font-bold">Aucune consommation enregistree</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {tab === 'prices' && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {prices.map(p => {
            const trend = p.variationPct > 0 ? 'up' : p.variationPct < 0 ? 'down' : 'flat';
            return (
              <div key={p.itemId} className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                <div className="px-4 py-3 bg-slate-900 flex items-center justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="font-black text-white text-sm truncate">{p.name}</div>
                    <div className="text-[10px] text-slate-400">{p.points.length} reception{p.points.length > 1 ? 's' : ''}</div>
                  </div>
                  {trend !== 'flat' && (
                    <span className={'text-xs font-black px-2 py-1 rounded-md ' + (trend === 'up' ? 'bg-red-500/20 text-red-300' : 'bg-emerald-500/20 text-emerald-300')}>
                      {trend === 'up' ? '↑' : '↓'} {Math.abs(p.variationPct)}%
                    </span>
                  )}
                </div>
                <div className="p-4">
                  <div className="grid grid-cols-2 gap-3 mb-4">
                    <div>
                      <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest mb-1">Premier</p>
                      <p className="font-black text-slate-900 tabular-nums">{Math.round(p.firstCost).toLocaleString('fr-FR')} Ar</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest mb-1">Actuel</p>
                      <p className="font-black text-slate-900 tabular-nums">{Math.round(p.currentCost).toLocaleString('fr-FR')} Ar</p>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    {p.points.slice(-6).map((pt: any, i: number) => (
                      <div key={i} className="flex items-center justify-between text-xs">
                        <span className="text-slate-400 tabular-nums">
                          {new Date(pt.date).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })}
                        </span>
                        <span className="text-slate-500 text-[10px] font-mono truncate max-w-[80px]">{pt.reference || '—'}</span>
                        <span className="font-bold text-slate-900 tabular-nums">{Math.round(pt.unitCost).toLocaleString('fr-FR')} Ar</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
          {prices.length === 0 && (
            <div className="col-span-full bg-white rounded-2xl border border-slate-200 p-12 text-center">
              <p className="text-slate-600 font-semibold">Aucun historique de prix</p>
              <p className="text-xs text-slate-400 mt-1">Passez des commandes fournisseur pour construire l historique</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
