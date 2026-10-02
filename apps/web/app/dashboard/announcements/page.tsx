'use client';

import { useState, useEffect } from 'react';
import { apiFetch } from '../../../lib/api';
import ConfirmDialog from '../../../components/ConfirmDialog';
import { Modal, Button, FormField, Input, Select, Textarea } from '../../../components/ui';

const TYPES = [
  { value: 'INFO',    label: 'Information', icon: 'ℹ️', color: '#3b82f6' },
  { value: 'SUCCESS', label: 'Succès',      icon: '✅', color: '#10b981' },
  { value: 'WARNING', label: 'Attention',   icon: '⚠️', color: '#f59e0b' },
  { value: 'DANGER',  label: 'Critique',    icon: '🚨', color: '#dc2626' },
];

const ORG_TYPES = ['COMMERCE', 'HOTEL', 'RESTAURANT', 'ECOLE', 'CLINIQUE', 'ONG', 'MICROFINANCE', 'BANQUE'];

function typeMeta(t: string) { return TYPES.find((x) => x.value === t) || TYPES[0]; }

function fmtDate(d: string | null) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default function AnnouncementsPage() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [toDelete, setToDelete] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [type, setType] = useState('INFO');
  const [target, setTarget] = useState('ALL');
  const [targetTypes, setTargetTypes] = useState<string[]>([]);
  const [startsAt, setStartsAt] = useState('');
  const [endsAt, setEndsAt] = useState('');
  const [isDismissible, setIsDismissible] = useState(true);
  const [isActive, setIsActive] = useState(true);

  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : '';

  async function load() {
    const res = await apiFetch('/api/announcements', { headers: { Authorization: `Bearer ${token}` } });
    const d = await res.json();
    setItems(Array.isArray(d) ? d : []);
  }

  useEffect(() => { load().catch(console.error).finally(() => setLoading(false)); }, []);

  function showToast(m: string) { setToast(m); setTimeout(() => setToast(null), 2500); }

  function resetForm() {
    setEditing(null);
    setTitle(''); setMessage(''); setType('INFO'); setTarget('ALL');
    setTargetTypes([]); setStartsAt(''); setEndsAt('');
    setIsDismissible(true); setIsActive(true); setError(null);
  }

  function openCreate() { resetForm(); setShowModal(true); }

  function openEdit(a: any) {
    setEditing(a);
    setTitle(a.title); setMessage(a.message); setType(a.type); setTarget(a.target);
    setTargetTypes(a.targetTypes ? a.targetTypes.split(',').map((x: string) => x.trim()) : []);
    setStartsAt(a.startsAt ? a.startsAt.slice(0, 16) : '');
    setEndsAt(a.endsAt ? a.endsAt.slice(0, 16) : '');
    setIsDismissible(a.isDismissible); setIsActive(a.isActive); setError(null);
    setShowModal(true);
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setError(null); setSaving(true);
    const method = editing ? 'PATCH' : 'POST';
    const url = editing ? `/api/announcements/${editing.id}` : '/api/announcements';
    const res = await apiFetch(url, {
      method,
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title, message, type, target,
        targetTypes: target === 'ORG_TYPE' ? targetTypes.join(',') : null,
        startsAt: startsAt ? new Date(startsAt).toISOString() : null,
        endsAt: endsAt ? new Date(endsAt).toISOString() : null,
        isDismissible, isActive,
      }),
    });
    setSaving(false);
    if (res.ok) {
      showToast(editing ? 'Annonce mise à jour' : 'Annonce créée');
      setShowModal(false); resetForm(); await load();
    } else {
      const d = await res.json();
      setError(d.message || 'Erreur');
    }
  }

  async function confirmDelete() {
    if (!toDelete) return;
    await apiFetch(`/api/announcements/${toDelete.id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    setToDelete(null); showToast('Annonce supprimée'); await load();
  }

  function toggleTargetType(t: string) {
    setTargetTypes((prev) => prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]);
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-10 w-10 border-4 border-teal-400 border-t-transparent"></div>
      </div>
    );
  }

  const active = items.filter((a) => a.isActive).length;

  return (
    <div className="space-y-5">
      {toast && (
        <div className="fixed top-20 right-4 z-[100] bg-slate-900 text-white px-4 py-3 rounded-xl shadow-2xl text-sm font-medium">
          {toast}
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <p className="text-xs font-black text-teal-600 uppercase tracking-widest mb-1">Communication</p>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">Annonces globales</h1>
          <p className="text-slate-500 mt-1">
            {items.length} annonce{items.length > 1 ? 's' : ''} · {active} active{active > 1 ? 's' : ''}
          </p>
        </div>
        <Button
          onClick={openCreate}
          icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" /></svg>}
        >
          Nouvelle annonce
        </Button>
      </div>

      {items.length === 0 ? (
        <div className="bg-white rounded-2xl border-2 border-dashed border-slate-200 p-16 text-center">
          <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center text-3xl mx-auto mb-3">��</div>
          <p className="text-lg font-bold text-slate-700 mb-1">Aucune annonce</p>
          <p className="text-sm text-slate-400">Créez votre première annonce pour communiquer avec les tenants</p>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((a) => {
            const meta = typeMeta(a.type);
            const isLive = a.isActive && new Date(a.startsAt) <= new Date() && (!a.endsAt || new Date(a.endsAt) >= new Date());
            return (
              <div key={a.id} className={'bg-white rounded-2xl border-2 overflow-hidden transition ' + (isLive ? 'border-teal-300 shadow-md' : 'border-slate-200')}>
                <div className="flex items-start gap-4 p-5">
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl shrink-0" style={{ background: meta.color + '20', color: meta.color }}>
                    {meta.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <h3 className="font-black text-slate-900 text-base truncate">{a.title}</h3>
                      <span className="text-[9px] font-black tracking-widest px-2 py-0.5 rounded-md text-white" style={{ background: meta.color }}>
                        {meta.label.toUpperCase()}
                      </span>
                      {isLive && (
                        <span className="inline-flex items-center gap-1 text-[9px] font-black tracking-widest px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-700">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                          LIVE
                        </span>
                      )}
                      {!a.isActive && (
                        <span className="text-[9px] font-black tracking-widest px-2 py-0.5 rounded-md bg-slate-200 text-slate-600">
                          DÉSACTIVÉE
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-slate-600 whitespace-pre-wrap line-clamp-3">{a.message}</p>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-[11px] text-slate-400">
                      <span>Cible : <strong className="text-slate-600">{a.target === 'ALL' ? 'Tous les tenants' : a.target === 'ORG_TYPE' ? a.targetTypes : 'Sélection'}</strong></span>
                      <span>Du {fmtDate(a.startsAt)} {a.endsAt ? `au ${fmtDate(a.endsAt)}` : '(sans fin)'}</span>
                      {a.createdBy && <span>par {a.createdBy.name || a.createdBy.email}</span>}
                    </div>
                  </div>
                  <div className="flex gap-1.5 shrink-0">
                    <button onClick={() => openEdit(a)} className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-blue-100 text-slate-500 hover:text-blue-600 flex items-center justify-center transition" title="Modifier">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                    </button>
                    <button onClick={() => setToDelete(a)} className="w-8 h-8 rounded-lg bg-red-50 hover:bg-red-100 text-red-500 flex items-center justify-center transition" title="Supprimer">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M1 7h22M9 7V4a2 2 0 012-2h2a2 2 0 012 2v3" /></svg>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Modal
        open={showModal}
        onClose={() => { setShowModal(false); resetForm(); }}
        title={editing ? 'Modifier l annonce' : 'Nouvelle annonce'}
        subtitle={editing ? editing.title : 'Communiquer avec les tenants'}
        icon={<span className="text-2xl">📢</span>}
        size="lg"
        footer={
          <div className="flex gap-3">
            <Button variant="secondary" onClick={() => { setShowModal(false); resetForm(); }}>Annuler</Button>
            <button type="submit" form="ann-form" disabled={saving} className="flex-1 bg-linear-to-r from-blue-600 to-teal-500 text-white py-2.5 rounded-xl font-semibold hover:shadow-lg transition disabled:opacity-50">
              {saving ? 'Enregistrement...' : editing ? 'Enregistrer' : 'Publier'}
            </button>
          </div>
        }
      >
        <form id="ann-form" onSubmit={save} className="space-y-4">
          {error && <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">{error}</div>}

          <FormField label="Titre" required>
            <Input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Maintenance prévue le 15 janvier" required />
          </FormField>

          <FormField label="Message" required>
            <Textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={4} placeholder="Détails de l'annonce..." required />
          </FormField>

          <div className="grid grid-cols-2 gap-3">
            <FormField label="Type">
              <Select value={type} onChange={(e) => setType(e.target.value)}>
                {TYPES.map((t) => <option key={t.value} value={t.value}>{t.icon} {t.label}</option>)}
              </Select>
            </FormField>
            <FormField label="Cible">
              <Select value={target} onChange={(e) => setTarget(e.target.value)}>
                <option value="ALL">Tous les tenants</option>
                <option value="ORG_TYPE">Par type d organisation</option>
              </Select>
            </FormField>
          </div>

          {target === 'ORG_TYPE' && (
            <FormField label="Types concernés" hint="Cliquez pour sélectionner">
              <div className="flex flex-wrap gap-1.5">
                {ORG_TYPES.map((t) => (
                  <button key={t} type="button" onClick={() => toggleTargetType(t)}
                    className={'px-3 py-1.5 rounded-lg text-xs font-bold transition ' + (targetTypes.includes(t) ? 'bg-slate-900 text-white shadow' : 'bg-white border border-slate-200 text-slate-600 hover:border-slate-400')}>
                    {t}
                  </button>
                ))}
              </div>
            </FormField>
          )}

          <div className="grid grid-cols-2 gap-3">
            <FormField label="Début">
              <Input type="datetime-local" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} />
            </FormField>
            <FormField label="Fin (optionnel)">
              <Input type="datetime-local" value={endsAt} onChange={(e) => setEndsAt(e.target.value)} />
            </FormField>
          </div>

          <div className="flex gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} className="w-4 h-4 rounded text-teal-600" />
              <span className="text-sm font-medium text-slate-700">Activer immédiatement</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={isDismissible} onChange={(e) => setIsDismissible(e.target.checked)} className="w-4 h-4 rounded text-teal-600" />
              <span className="text-sm font-medium text-slate-700">Fermable par l utilisateur</span>
            </label>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!toDelete}
        title="Supprimer l annonce"
        message={`Supprimer "${toDelete?.title}" ?`}
        onClose={() => setToDelete(null)}
        onConfirm={confirmDelete}
      />
    </div>
  );
}
