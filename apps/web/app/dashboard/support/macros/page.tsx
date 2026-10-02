'use client';

import { useState, useEffect } from 'react';
import { apiFetch } from '../../../../lib/api';
import ConfirmDialog from '../../../../components/ConfirmDialog';

const CATEGORIES = [
  { value: '',               label: 'Toutes' },
  { value: 'BUG',            label: '🐛 Bug' },
  { value: 'FEATURE_REQUEST', label: '✨ Demande' },
  { value: 'QUESTION',       label: '❓ Question' },
  { value: 'BILLING',        label: '💳 Facturation' },
  { value: 'OTHER',          label: '📌 Autre' },
];

export default function MacrosPage() {
  const [macros, setMacros] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [toDelete, setToDelete] = useState<any>(null);
  const [saving, setSaving] = useState(false);

  const [name, setName] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState('');

  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : '';
  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  async function load() {
    const res = await apiFetch('/api/support/macros', { headers });
    const data = await res.json();
    setMacros(Array.isArray(data) ? data : []);
  }

  useEffect(() => { load().catch(console.error).finally(() => setLoading(false)); }, []);

  function showToast(m: string) { setToast(m); setTimeout(() => setToast(null), 2500); }

  function resetForm() {
    setEditing(null);
    setName('');
    setContent('');
    setCategory('');
  }

  function openCreate() { resetForm(); setShowModal(true); }

  function openEdit(m: any) {
    setEditing(m);
    setName(m.name);
    setContent(m.content);
    setCategory(m.category || '');
    setShowModal(true);
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const method = editing ? 'PATCH' : 'POST';
    const url = editing ? `/api/support/macros/${editing.id}` : '/api/support/macros';
    const res = await apiFetch(url, {
      method, headers,
      body: JSON.stringify({ name, content, category: category || null }),
    });
    setSaving(false);
    if (res.ok) {
      showToast(editing ? 'Macro mise à jour' : 'Macro créée');
      setShowModal(false);
      resetForm();
      await load();
    }
  }

  async function confirmDelete() {
    if (!toDelete) return;
    await apiFetch(`/api/support/macros/${toDelete.id}`, { method: 'DELETE', headers });
    setToDelete(null);
    showToast('Macro supprimée');
    await load();
  }

  if (loading) {
    return <div className="flex justify-center items-center h-64"><div className="animate-spin rounded-full h-10 w-10 border-4 border-teal-400 border-t-transparent"></div></div>;
  }

  return (
    <div className="space-y-4 max-w-4xl mx-auto">
      {toast && <div className="fixed top-20 right-4 z-[100] bg-slate-900 text-white px-4 py-3 rounded-xl shadow-2xl text-sm font-medium">{toast}</div>}

      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <p className="text-[10px] font-black text-teal-600 uppercase tracking-widest mb-1">Support</p>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">Macros</h1>
          <p className="text-slate-500 mt-1 text-sm">Réponses pré-écrites pour vos tickets</p>
        </div>
        <div className="flex gap-2">
          <a href="/dashboard/support" className="inline-flex items-center gap-2 px-4 py-2.5 bg-white border-2 border-slate-300 rounded-xl text-sm font-semibold text-slate-700 hover:bg-slate-100 transition">
            ← Retour support
          </a>
          <button
            onClick={openCreate}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-blue-600 to-teal-500 hover:shadow-lg text-white rounded-xl font-black text-sm transition"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" />
            </svg>
            Nouvelle macro
          </button>
        </div>
      </div>

      {macros.length === 0 ? (
        <div className="bg-white rounded-2xl border-2 border-dashed border-slate-200 p-16 text-center">
          <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center text-3xl mx-auto mb-3">⚡</div>
          <p className="text-lg font-bold text-slate-700 mb-1">Aucune macro</p>
          <p className="text-sm text-slate-400">Créez vos premières réponses pré-écrites pour gagner du temps</p>
        </div>
      ) : (
        <div className="space-y-2">
          {macros.map((m) => (
            <div key={m.id} className="bg-white rounded-xl border border-slate-200 p-4 hover:border-teal-300 transition">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white text-lg shrink-0">
                  ⚡
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <h3 className="font-black text-slate-900 text-base">{m.name}</h3>
                    {m.category && (
                      <span className="text-[9px] font-black tracking-widest px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
                        {m.category}
                      </span>
                    )}
                    <span className="text-[10px] text-slate-400 ml-auto">utilisée {m.usageCount}×</span>
                  </div>
                  <p className="text-sm text-slate-600 whitespace-pre-wrap line-clamp-3">{m.content}</p>
                </div>
                <div className="flex gap-1 shrink-0">
                  <button onClick={() => openEdit(m)} className="w-8 h-8 rounded-md bg-slate-100 hover:bg-blue-100 text-slate-500 hover:text-blue-600 flex items-center justify-center transition">
                    ✏️
                  </button>
                  <button onClick={() => setToDelete(m)} className="w-8 h-8 rounded-md bg-red-50 hover:bg-red-100 text-red-500 flex items-center justify-center transition">
                    🗑️
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => { setShowModal(false); resetForm(); }}></div>
          <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden">
            <div className="bg-gradient-to-r from-slate-900 via-blue-900 to-teal-900 px-6 py-5 text-white">
              <h2 className="text-xl font-black">{editing ? 'Modifier la macro' : 'Nouvelle macro'}</h2>
              <p className="text-xs text-blue-200 mt-1">Réponse pré-écrite</p>
            </div>
            <form onSubmit={save} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Nom <span className="text-red-500">*</span></label>
                <input type="text" value={name} onChange={(e) => setName(e.target.value)} required
                  placeholder="Ex: Demande d'informations"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:ring-2 focus:ring-teal-400" />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Catégorie</label>
                <select value={category} onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900">
                  <option value="">— Aucune —</option>
                  {CATEGORIES.filter((c) => c.value).map((c) => (
                    <option key={c.value} value={c.value}>{c.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Contenu <span className="text-red-500">*</span></label>
                <textarea value={content} onChange={(e) => setContent(e.target.value)} required rows={6}
                  placeholder="Rédigez votre réponse type ici…"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:ring-2 focus:ring-teal-400 resize-none font-mono" />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => { setShowModal(false); resetForm(); }}
                  className="px-5 py-3 bg-white border-2 border-slate-200 rounded-xl font-bold text-sm text-slate-700 hover:bg-slate-100 transition">
                  Annuler
                </button>
                <button type="submit" disabled={saving}
                  className="flex-1 bg-gradient-to-r from-blue-600 to-teal-500 hover:shadow-lg text-white rounded-xl font-black text-sm transition disabled:opacity-50">
                  {saving ? 'Enregistrement…' : editing ? 'Enregistrer' : 'Créer la macro'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={!!toDelete}
        title="Supprimer la macro"
        message={`Supprimer "${toDelete?.name}" ?`}
        onClose={() => setToDelete(null)}
        onConfirm={confirmDelete}
      />
    </div>
  );
}
