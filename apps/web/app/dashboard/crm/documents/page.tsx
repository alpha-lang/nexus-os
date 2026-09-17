'use client';

import { useState, useEffect, useMemo } from 'react';
import { apiFetch } from '../../../../lib/api';

export default function DocumentsPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [search, setSearch] = useState('');

  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : '';

  useEffect(() => {
    apiFetch('/api/crm/documents?take=100', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    let list = data?.items || [];
    if (typeFilter !== 'ALL') list = list.filter((d: any) => d.type === typeFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((d: any) => d.name?.toLowerCase().includes(q) || d.customer?.name?.toLowerCase().includes(q));
    }
    return list;
  }, [data, typeFilter, search]);

  const types = useMemo(() => {
    const set = new Set<string>();
    (data?.items || []).forEach((d: any) => { if (d.type) set.add(d.type); });
    return Array.from(set);
  }, [data]);

  function humanSize(bytes: number | null) {
    if (!bytes) return '—';
    if (bytes < 1024) return bytes + ' o';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' Ko';
    return (bytes / 1024 / 1024).toFixed(2) + ' Mo';
  }

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
        <h1 className="text-3xl font-black text-slate-900 tracking-tight">Documents</h1>
        <p className="text-slate-500 mt-1">Bibliothèque documentaire liée à vos partenaires</p>
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
            Tous <span className="opacity-60 ml-1">{data?.items?.length || 0}</span>
          </button>
          {types.map((t) => (
            <button key={t} onClick={() => setTypeFilter(t)} className={'px-3 py-1.5 rounded-lg text-xs font-bold transition ' + (typeFilter === t ? 'bg-slate-900 text-white' : 'bg-white border border-slate-200 text-slate-600')}>
              {t}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border-2 border-dashed border-slate-200 p-16 text-center">
          <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center text-3xl mx-auto mb-3">📎</div>
          <p className="text-lg font-bold text-slate-700 mb-1">Aucun document</p>
          <p className="text-sm text-slate-400">Ajoutez des documents depuis la fiche d'un partenaire</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map((d: any) => (
            <div key={d.id} className="bg-white rounded-2xl border border-slate-200 p-4 hover:border-teal-400 hover:shadow-md transition group">
              <div className="flex items-start gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-white text-lg shrink-0">
                  {d.type?.includes('pdf') ? '📄' : d.type?.includes('image') ? '🖼️' : '📎'}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-slate-900 text-sm truncate">{d.name}</h3>
                  <p className="text-[10px] text-slate-500">{d.type || 'Document'} {d.size ? `· ${humanSize(d.size)}` : ''}</p>
                </div>
              </div>

              <div className="text-[10px] text-slate-500 mb-3 pb-3 border-b border-slate-100">
                <a href={`/dashboard/crm/partners/${d.customer?.id}`} className="font-bold text-slate-700 hover:text-teal-600">
                  {d.customer?.name || 'Partenaire inconnu'}
                </a>
                <span className="text-slate-400"> · {new Date(d.createdAt).toLocaleDateString('fr-FR')}</span>
              </div>

              <a href={d.url} target="_blank" rel="noopener noreferrer" className="text-xs font-black text-teal-600 hover:text-teal-700 inline-flex items-center gap-1">
                Ouvrir le document ↗
              </a>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
