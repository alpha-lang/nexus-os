'use client';

import { useState, useEffect, useMemo } from 'react';
import { apiFetch } from '../../../../lib/api';

const TYPE_META: Record<string, { label: string; icon: string; color: string }> = {
  CALL: { label: 'Appel', icon: '📞', color: 'bg-blue-100 text-blue-700' },
  EMAIL: { label: 'Email', icon: '✉️', color: 'bg-cyan-100 text-cyan-700' },
  MEETING: { label: 'Rendez-vous', icon: '🤝', color: 'bg-emerald-100 text-emerald-700' },
  VISIT: { label: 'Visite', icon: '🚗', color: 'bg-amber-100 text-amber-700' },
  NOTE: { label: 'Note', icon: '📝', color: 'bg-slate-100 text-slate-700' },
  OTHER: { label: 'Autre', icon: '📌', color: 'bg-purple-100 text-purple-700' },
};

export default function InteractionsPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [search, setSearch] = useState('');

  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : '';

  useEffect(() => {
    apiFetch('/api/crm/interactions?take=100', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    let list = data?.items || [];
    if (typeFilter !== 'ALL') list = list.filter((i: any) => i.type === typeFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((i: any) =>
        i.subject?.toLowerCase().includes(q) ||
        i.content?.toLowerCase().includes(q) ||
        i.partner?.name?.toLowerCase().includes(q)
      );
    }
    return list;
  }, [data, typeFilter, search]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { ALL: data?.items?.length || 0 };
    (data?.items || []).forEach((i: any) => { c[i.type] = (c[i.type] || 0) + 1; });
    return c;
  }, [data]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-10 w-10 border-4 border-teal-400 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <p className="text-xs font-black text-teal-600 uppercase tracking-widest mb-1">Relation client</p>
        <h1 className="text-3xl font-black text-slate-900 tracking-tight">Interactions</h1>
        <p className="text-slate-500 mt-1">Historique des échanges avec vos partenaires</p>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-3 space-y-3">
        <div className="relative">
          <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
          </span>
          <input type="text" placeholder="Rechercher…" value={search} onChange={(e) => setSearch(e.target.value)} className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-teal-400" />
        </div>
        <div className="flex flex-wrap gap-1.5">
          <button onClick={() => setTypeFilter('ALL')} className={'px-3 py-1.5 rounded-lg text-xs font-bold transition ' + (typeFilter === 'ALL' ? 'bg-slate-900 text-white' : 'bg-white border border-slate-200 text-slate-600')}>
            Toutes <span className="opacity-60 ml-1">{counts.ALL}</span>
          </button>
          {Object.entries(TYPE_META).map(([k, v]) => (
            <button key={k} onClick={() => setTypeFilter(k)} className={'px-3 py-1.5 rounded-lg text-xs font-bold transition ' + (typeFilter === k ? 'bg-slate-900 text-white' : 'bg-white border border-slate-200 text-slate-600')}>
              {v.icon} {v.label}{counts[k] ? <span className="opacity-60 ml-1">{counts[k]}</span> : null}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border-2 border-dashed border-slate-200 p-16 text-center">
          <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center text-3xl mx-auto mb-3">🎯</div>
          <p className="text-lg font-bold text-slate-700 mb-1">Aucune interaction</p>
          <p className="text-sm text-slate-400">Les interactions s'ajoutent depuis la fiche d'un partenaire</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((it: any) => {
            const meta = TYPE_META[it.type] || TYPE_META.OTHER;
            return (
              <a key={it.id} href={`/dashboard/crm/partners/${it.partner?.id}`} className="group block bg-white rounded-2xl border border-slate-200 hover:border-teal-400 hover:shadow-md transition p-4">
                <div className="flex items-start gap-4">
                  <div className={`w-11 h-11 rounded-xl flex items-center justify-center text-lg shrink-0 ${meta.color}`}>{meta.icon}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className={`text-[9px] font-black tracking-widest px-2 py-0.5 rounded-md ${meta.color}`}>{meta.label.toUpperCase()}</span>
                      <h3 className="font-bold text-slate-900 text-sm truncate">{it.subject}</h3>
                    </div>
                    {it.content && <p className="text-xs text-slate-600 line-clamp-2 mb-1">{it.content}</p>}
                    <p className="text-[10px] text-slate-400">
                      {it.partner?.name || 'Partenaire inconnu'}
                      {it.user && ` · par ${it.user.name || it.user.email}`}
                    </p>
                  </div>
                  <span className="text-[10px] text-slate-400 shrink-0">{new Date(it.createdAt).toLocaleDateString('fr-FR')}</span>
                </div>
              </a>
            );
          })}
        </div>
      )}
    </div>
  );
}
