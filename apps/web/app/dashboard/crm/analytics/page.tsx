'use client';

import { useState, useEffect } from 'react';
import { apiFetch } from '../../../../lib/api';

export default function CrmAnalyticsPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : '';

  useEffect(() => {
    apiFetch('/api/crm/analytics', { headers: { Authorization: `Bearer ${token}` } })
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

  const s = data?.summary || {};
  const maxGrowth = Math.max(...(data?.monthlyGrowth || []).map((m: any) => m.count), 1);
  const totalType = (data?.byType?.CUSTOMER || 0) + (data?.byType?.SUPPLIER || 0) + (data?.byType?.BOTH || 0);

  return (
    <div className="space-y-5">
      <div>
        <p className="text-xs font-black text-teal-600 uppercase tracking-widest mb-1">Intelligence CRM</p>
        <h1 className="text-3xl font-black text-slate-900 tracking-tight">Analytics</h1>
        <p className="text-slate-500 mt-1">Segmentation, croissance et performance</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-slate-900 rounded-2xl p-5 text-white">
          <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest mb-1">CA total</p>
          <p className="text-2xl font-black tabular-nums text-teal-400">{(s.totalRevenue || 0).toLocaleString('fr-FR')}</p>
          <p className="text-[10px] text-slate-500 mt-0.5">Ar cumulés clients</p>
        </div>
        <div className="bg-white rounded-2xl p-5 border border-emerald-200">
          <p className="text-[10px] text-emerald-700 uppercase font-black tracking-widest mb-1">Actifs</p>
          <p className="text-2xl font-black text-emerald-600 tabular-nums">{s.activePartners || 0}</p>
          <p className="text-[10px] text-slate-400 mt-0.5">partenaires actifs</p>
        </div>
        <div className="bg-white rounded-2xl p-5 border border-slate-200">
          <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest mb-1">Panier moyen</p>
          <p className="text-2xl font-black text-slate-900 tabular-nums">{(s.averageRevenuePerClient || 0).toLocaleString('fr-FR')}</p>
          <p className="text-[10px] text-slate-400 mt-0.5">Ar / client</p>
        </div>
        <div className="bg-white rounded-2xl p-5 border border-slate-200">
          <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest mb-1">Inactifs</p>
          <p className="text-2xl font-black text-slate-400 tabular-nums">{s.inactivePartners || 0}</p>
          <p className="text-[10px] text-slate-400 mt-0.5">à relancer</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <h3 className="font-black text-slate-900 text-sm mb-4">📈 Nouveaux partenaires (6 mois)</h3>
          <div className="flex items-end gap-2 h-40">
            {(data?.monthlyGrowth || []).map((m: any) => (
              <div key={m.month} className="flex-1 flex flex-col items-center gap-1">
                <div className="w-full bg-gradient-to-t from-teal-500 to-blue-500 rounded-t-lg" style={{ height: `${Math.max(4, (m.count / maxGrowth) * 100)}%` }}></div>
                <span className="text-[10px] font-bold text-slate-500 capitalize">{m.label}</span>
                <span className="text-[10px] font-black text-slate-900">{m.count}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <h3 className="font-black text-slate-900 text-sm mb-4">🥧 Répartition par type</h3>
          <div className="space-y-3">
            {[
              { key: 'CUSTOMER', label: '👤 Clients', color: '#10b981' },
              { key: 'SUPPLIER', label: '🚚 Fournisseurs', color: '#06b6d4' },
              { key: 'BOTH', label: '🤝 Mixtes', color: '#8b5cf6' },
            ].map(({ key, label, color }) => {
              const count = data?.byType?.[key] || 0;
              const pct = totalType > 0 ? Math.round((count / totalType) * 100) : 0;
              return (
                <div key={key}>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-bold text-slate-700">{label}</span>
                    <span className="text-sm font-black text-slate-900 tabular-nums">{count} <span className="text-[10px] text-slate-400">({pct}%)</span></span>
                  </div>
                  <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${Math.max(pct, 2)}%`, background: color }}></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <h3 className="font-black text-slate-900 text-sm mb-4">📍 Top villes</h3>
          <div className="space-y-2">
            {(data?.byCity || []).map((c: any) => {
              const max = data.byCity[0]?.count || 1;
              const pct = Math.round((c.count / max) * 100);
              return (
                <div key={c.city} className="flex items-center gap-3">
                  <span className="text-xs font-medium text-slate-700 w-32 truncate">{c.city}</span>
                  <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-blue-500 to-cyan-400 rounded-full" style={{ width: `${pct}%` }}></div>
                  </div>
                  <span className="text-xs font-black text-slate-900 w-8 text-right tabular-nums">{c.count}</span>
                </div>
              );
            })}
            {(data?.byCity || []).length === 0 && <p className="text-xs text-slate-400 text-center py-4">Aucune ville renseignée</p>}
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <h3 className="font-black text-slate-900 text-sm mb-4">💚 Score de santé</h3>
          <div className="grid grid-cols-2 gap-3">
            {[
              { key: 'excellent', label: 'Excellent (80+)', color: 'bg-emerald-500', icon: '🌟' },
              { key: 'bon', label: 'Bon (60-79)', color: 'bg-teal-500', icon: '👍' },
              { key: 'moyen', label: 'Moyen (40-59)', color: 'bg-amber-500', icon: '⚠️' },
              { key: 'faible', label: 'Faible (<40)', color: 'bg-red-500', icon: '🔻' },
            ].map(({ key, label, color, icon }) => (
              <div key={key} className="bg-slate-50 rounded-xl p-3">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`w-2 h-2 rounded-full ${color}`}></span>
                  <span className="text-[10px] text-slate-500 uppercase font-black tracking-wider">{icon} {label.split(' ')[0]}</span>
                </div>
                <p className="text-2xl font-black text-slate-900 tabular-nums">{data?.byScore?.[key] || 0}</p>
              </div>
            ))}
          </div>
        </div>

        {data?.byTag?.length > 0 && (
          <div className="bg-white rounded-2xl border border-slate-200 p-5 lg:col-span-2">
            <h3 className="font-black text-slate-900 text-sm mb-4">🏷️ Tags les plus utilisés</h3>
            <div className="flex flex-wrap gap-2">
              {(data.byTag || []).map((t: any) => (
                <span key={t.tag} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-slate-700 to-slate-900 text-white text-xs font-bold">
                  {t.tag}
                  <span className="bg-white/25 px-1.5 rounded text-[10px]">{t.count}</span>
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
