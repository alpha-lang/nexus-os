'use client';

import { useState, useEffect } from 'react';
import { apiFetch } from '../../../lib/api';
import ConfirmDialog from '../../../components/ConfirmDialog';

const TYPES = [
  { value: 'FEATURE', label: 'Nouveauté', icon: '✨', color: '#10b981' },
  { value: 'FIX',     label: 'Correction', icon: '🐛', color: '#3b82f6' },
  { value: 'IMPROVEMENT', label: 'Amélioration', icon: '⚡', color: '#f59e0b' },
  { value: 'BREAKING', label: 'Breaking change', icon: '⚠️', color: '#dc2626' },
];

function typeMeta(t: string) { return TYPES.find((x) => x.value === t) || TYPES[0]; }

export default function ChangelogPage() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [toDelete, setToDelete] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [version, setVersion] = useState('');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [type, setType] = useState('FEATURE');
  const [publishedAt, setPublishedAt] = useState('');
  const [isActive, setIsActive] = useState(true);

  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : '';
  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  async function load() {
    const res = await apiFetch('/api/changelog', { headers });
    const d = await res.json();
    setItems(Array.isArray(d) ? d : []);
  }

  useEffect(() => { load().catch(console.error).finally(() => setLoading(false)); }, []);

  function showToast(m: string) { setToast(m); setTimeout(() => setToast(null), 2500); }

  function resetForm() {
    setEditing(null);
    setVersion(''); setTitle(''); setBody('');
    setType('FEATURE'); setPublishedAt(''); setIsActive(true); setError(null);
  }

  function openCreate() { resetForm(); setShowModal(true); }

  function openEdit(e: any) {
    setEditing(e);
    setVersion(e.version); setTitle(e.title); setBody(e.body); setType(e.type);
    setPublishedAt(e.publishedAt ? e.publishedAt.slice(0, 16) : '');
    setIsActive(e.isActive); setError(null);
    setShowModal(true);
  }

  async function save(ev: React.FormEvent) {
    ev.preventDefault();
    setError(null); setSaving(true);
    const method = editing ? 'PATCH' : 'POST';
    const url = editing ? `/api/changelog/${editing.id}` : '/api/changelog';
    const res = await apiFetch(url, {
      method, headers,
      body: JSON.stringify({
        version, title, body, type,
        publishedAt: publishedAt ? new Date(publishedAt).toISOString() : null,
        isActive,
      }),
    });
    setSaving(false);
    if (res.ok) {
      showToast(editing ? 'Entrée mise à jour' : 'Entrée publiée');
      setShowModal(false); resetForm(); await load();
    } else {
      const d = await res.json();
      setError(d.message || 'Erreur');
    }
  }

  async function confirmDelete() {
    if (!toDelete) return;
    await apiFetch(`/api/changelog/${toDelete.id}`, { method: 'DELETE', headers });
    setToDelete(null); showToast('Entrée supprimée'); await load();
  }

  if (loading) {
    return <div className="flex justify-center items-center h-64"><div className="animate-spin rounded-full h-10 w-10 border-4 border-teal-400 border-t-transparent"></div></div>;
  }

  return (
    <div className="space-y-5">
      {toast && <div className="fixed top-20 right-4 z-[100] bg-slate-900 text-white px-4 py-3 rounded-xl shadow-2xl text-sm font-medium">{toast}</div>}

      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <p className="text-xs font-black text-teal-600 uppercase tracking-widest mb-1">Communication</p>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">Changelog</h1>
          <p className="text-slate-500 mt-1">
            {items.length} entrée{items.length > 1 ? 's' : ''} · publiez vos nouveautés aux tenants
          </p>
        </div>
        <button
          onClick={openCreate}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-blue-600 to-teal-500 hover:shadow-lg text-white rounded-xl font-black text-sm transition shrink-0"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" />
          </svg>
          Nouvelle entrée
        </button>
      </div>

      {items.length === 0 ? (
        <div className="bg-white rounded-2xl border-2 border-dashed border-slate-200 p-16 text-center">
          <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center text-3xl mx-auto mb-3">📢</div>
          <p className="text-lg font-bold text-slate-700 mb-1">Aucune entrée</p>
          <p className="text-sm text-slate-400">Documentez vos nouveautés pour vos utilisateurs</p>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((e) => {
            const meta = typeMeta(e.type);
            return (
              <div key={e.id} className={'bg-white rounded-2xl border-2 overflow-hidden transition ' + (e.isActive ? 'border-slate-200 hover:border-teal-300' : 'border-slate-200 opacity-60')}>
                <div className="flex items-start gap-4 p-5">
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl shrink-0" style={{ background: meta.color + '20', color: meta.color }}>
                    {meta.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="font-mono text-xs font-black px-2 py-0.5 rounded bg-slate-900 text-white">v{e.version}</span>
                      <span className="text-[9px] font-black tracking-widest px-2 py-0.5 rounded-md text-white" style={{ background: meta.color }}>
                        {meta.label.toUpperCase()}
                      </span>
                      {!e.isActive && <span className="text-[9px] font-black tracking-widest px-2 py-0.5 rounded bg-slate-200 text-slate-600">BROUILLON</span>}
                    </div>
                    <h3 className="font-black text-slate-900 text-base">{e.title}</h3>
                    <p className="text-xs text-slate-400 mt-1">
                      Publié le {new Date(e.publishedAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })}
                    </p>
                  </div>
                  <div className="flex gap-1.5 shrink-0">
                    <button onClick={() => openEdit(e)} className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-blue-100 text-slate-500 hover:text-blue-600 flex items-center justify-center transition">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                    </button>
                    <button onClick={() => setToDelete(e)} className="w-8 h-8 rounded-lg bg-red-50 hover:bg-red-100 text-red-500 flex items-center justify-center transition">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M1 7h22M9 7V4a2 2 0 012-2h2a2 2 0 012 2v3" /></svg>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => { setShowModal(false); resetForm(); }}></div>
          <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden max-h-[92vh] flex flex-col">
            <div className="bg-gradient-to-r from-slate-900 via-blue-900 to-teal-900 px-6 py-5 text-white">
              <h2 className="text-xl font-black">{editing ? 'Modifier l entrée' : 'Nouvelle entrée'}</h2>
              <p className="text-xs text-blue-200 mt-1">Publiez une nouveauté</p>
            </div>
            <form onSubmit={save} className="p-6 space-y-4 overflow-y-auto">
              {error && <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">{error}</div>}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Version <span className="text-red-500">*</span></label>
                  <input type="text" value={version} onChange={(e) => setVersion(e.target.value)} required placeholder="2.1.0" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono text-slate-900 focus:ring-2 focus:ring-teal-400" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Type</label>
                  <select value={type} onChange={(e) => setType(e.target.value)} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900">
                    {TYPES.map((t) => <option key={t.value} value={t.value}>{t.icon} {t.label}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Titre <span className="text-red-500">*</span></label>
                <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} required placeholder="Nouveau module Spa" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:ring-2 focus:ring-teal-400" />
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Description <span className="text-red-500">*</span></label>
                <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={5} required placeholder="Détails, points clés…" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:ring-2 focus:ring-teal-400 resize-none" />
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Date de publication</label>
                <input type="datetime-local" value={publishedAt} onChange={(e) => setPublishedAt(e.target.value)} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900" />
              </div>

              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} className="w-4 h-4 rounded text-teal-600" />
                <span className="text-sm font-medium text-slate-700">Publier immédiatement</span>
              </label>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => { setShowModal(false); resetForm(); }} className="px-5 py-3 bg-white border-2 border-slate-200 rounded-xl font-bold text-sm text-slate-700 hover:bg-slate-100 transition">
                  Annuler
                </button>
                <button type="submit" disabled={saving} className="flex-1 bg-gradient-to-r from-blue-600 to-teal-500 hover:shadow-lg text-white rounded-xl font-black text-sm transition disabled:opacity-50">
                  {saving ? 'Enregistrement...' : editing ? 'Enregistrer' : 'Publier'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={!!toDelete}
        title="Supprimer l entrée"
        message={`Supprimer v${toDelete?.version} "${toDelete?.title}" ?`}
        onClose={() => setToDelete(null)}
        onConfirm={confirmDelete}
      />
    </div>
  );
}
