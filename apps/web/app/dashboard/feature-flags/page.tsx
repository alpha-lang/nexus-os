'use client';

import { useState, useEffect } from 'react';
import { apiFetch } from '../../../lib/api';
import ConfirmDialog from '../../../components/ConfirmDialog';
import { Modal, Button, FormField, Input, Select, Textarea } from '../../../components/ui';

export default function FeatureFlagsPage() {
  const [flags, setFlags] = useState<any[]>([]);
  const [orgs, setOrgs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [toDelete, setToDelete] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [overrideModal, setOverrideModal] = useState<any>(null);

  const [key, setKey] = useState('');
  const [label, setLabel] = useState('');
  const [description, setDescription] = useState('');
  const [defaultEnabled, setDefaultEnabled] = useState(false);
  const [isActive, setIsActive] = useState(true);

  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : '';
  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  async function load() {
    const [f, o] = await Promise.all([
      apiFetch('/api/feature-flags', { headers }).then((r) => r.json()),
      apiFetch('/api/organizations/clients', { headers }).then((r) => r.json()),
    ]);
    setFlags(Array.isArray(f) ? f : []);
    setOrgs(Array.isArray(o) ? o : []);
  }

  useEffect(() => { load().catch(console.error).finally(() => setLoading(false)); }, []);

  function showToast(m: string) { setToast(m); setTimeout(() => setToast(null), 2500); }

  function resetForm() {
    setEditing(null);
    setKey(''); setLabel(''); setDescription('');
    setDefaultEnabled(false); setIsActive(true); setError(null);
  }

  function openCreate() { resetForm(); setShowModal(true); }

  function openEdit(f: any) {
    setEditing(f);
    setKey(f.key); setLabel(f.label); setDescription(f.description || '');
    setDefaultEnabled(f.defaultEnabled); setIsActive(f.isActive); setError(null);
    setShowModal(true);
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setError(null); setSaving(true);
    const method = editing ? 'PATCH' : 'POST';
    const url = editing ? `/api/feature-flags/${editing.id}` : '/api/feature-flags';
    const res = await apiFetch(url, {
      method, headers,
      body: JSON.stringify({ key, label, description, defaultEnabled, isActive }),
    });
    setSaving(false);
    if (res.ok) {
      showToast(editing ? 'Flag mis à jour' : 'Flag créé');
      setShowModal(false); resetForm(); await load();
    } else {
      const d = await res.json();
      setError(d.message || 'Erreur');
    }
  }

  async function confirmDelete() {
    if (!toDelete) return;
    await apiFetch(`/api/feature-flags/${toDelete.id}`, { method: 'DELETE', headers });
    setToDelete(null); showToast('Flag supprimé'); await load();
  }

  async function setOverride(orgId: string, enabled: boolean) {
    if (!overrideModal) return;
    await apiFetch(`/api/feature-flags/${overrideModal.id}/override/${orgId}`, {
      method: 'PATCH', headers, body: JSON.stringify({ enabled }),
    });
    const updated = await apiFetch('/api/feature-flags', { headers }).then((r) => r.json());
    const found = updated.find((f: any) => f.id === overrideModal.id);
    setOverrideModal(found);
    await load();
  }

  async function removeOverride(orgId: string) {
    if (!overrideModal) return;
    await apiFetch(`/api/feature-flags/${overrideModal.id}/override/${orgId}`, { method: 'DELETE', headers });
    const updated = await apiFetch('/api/feature-flags', { headers }).then((r) => r.json());
    const found = updated.find((f: any) => f.id === overrideModal.id);
    setOverrideModal(found);
    await load();
  }

  if (loading) {
    return <div className="flex justify-center items-center h-64"><div className="animate-spin rounded-full h-10 w-10 border-4 border-teal-400 border-t-transparent"></div></div>;
  }

  return (
    <div className="space-y-5">
      {toast && <div className="fixed top-20 right-4 z-[100] bg-slate-900 text-white px-4 py-3 rounded-xl shadow-2xl text-sm font-medium">{toast}</div>}

      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <p className="text-xs font-black text-teal-600 uppercase tracking-widest mb-1">Produit</p>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">Feature Flags</h1>
          <p className="text-slate-500 mt-1">
            {flags.length} flag{flags.length > 1 ? 's' : ''} · activez une feature par tenant
          </p>
        </div>
        <Button onClick={openCreate} icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" /></svg>}>
          Nouveau flag
        </Button>
      </div>

      {flags.length === 0 ? (
        <div className="bg-white rounded-2xl border-2 border-dashed border-slate-200 p-16 text-center">
          <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center text-3xl mx-auto mb-3">🚩</div>
          <p className="text-lg font-bold text-slate-700 mb-1">Aucun flag</p>
          <p className="text-sm text-slate-400">Créez votre premier flag pour activer des features par tenant</p>
        </div>
      ) : (
        <div className="space-y-3">
          {flags.map((f) => (
            <div key={f.id} className={'bg-white rounded-2xl border-2 overflow-hidden transition ' + (f.isActive ? 'border-slate-200 hover:border-teal-300' : 'border-slate-200 opacity-70')}>
              <div className="flex items-start gap-4 p-5">
                <div className={'w-12 h-12 rounded-xl flex items-center justify-center text-2xl shrink-0 ' + (f.defaultEnabled ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500')}>
                  {f.defaultEnabled ? '✅' : '⬜'}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <h3 className="font-black text-slate-900 text-base">{f.label}</h3>
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-600">{f.key}</span>
                    {!f.isActive && <span className="text-[9px] font-black tracking-widest px-2 py-0.5 rounded bg-slate-200 text-slate-600">INACTIF</span>}
                    <span className={'text-[9px] font-black tracking-widest px-2 py-0.5 rounded ' + (f.defaultEnabled ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600')}>
                      DÉFAUT : {f.defaultEnabled ? 'ON' : 'OFF'}
                    </span>
                  </div>
                  {f.description && <p className="text-sm text-slate-600 line-clamp-2">{f.description}</p>}
                  <p className="text-[11px] text-slate-400 mt-2">
                    {f.overrides.length} override{f.overrides.length > 1 ? 's' : ''} tenant
                    {f.overrides.length > 0 && (
                      <span className="ml-1">
                        · {f.overrides.filter((o: any) => o.enabled).length} activé{f.overrides.filter((o: any) => o.enabled).length > 1 ? 's' : ''}
                      </span>
                    )}
                  </p>
                </div>
                <div className="flex gap-1.5 shrink-0">
                  <button onClick={() => setOverrideModal(f)} className="px-3 py-1.5 rounded-lg text-xs font-bold bg-teal-50 text-teal-700 hover:bg-teal-100 transition">
                    Tenants
                  </button>
                  <button onClick={() => openEdit(f)} className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-blue-100 text-slate-500 hover:text-blue-600 flex items-center justify-center transition">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                  </button>
                  <button onClick={() => setToDelete(f)} className="w-8 h-8 rounded-lg bg-red-50 hover:bg-red-100 text-red-500 flex items-center justify-center transition">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M1 7h22M9 7V4a2 2 0 012-2h2a2 2 0 012 2v3" /></svg>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal création/édition */}
      <Modal
        open={showModal}
        onClose={() => { setShowModal(false); resetForm(); }}
        title={editing ? 'Modifier le flag' : 'Nouveau feature flag'}
        subtitle={editing ? editing.key : 'Activez une feature à la demande'}
        icon={<span className="text-2xl">🚩</span>}
        footer={
          <div className="flex gap-3">
            <Button variant="secondary" onClick={() => { setShowModal(false); resetForm(); }}>Annuler</Button>
            <button type="submit" form="flag-form" disabled={saving} className="flex-1 bg-linear-to-r from-blue-600 to-teal-500 text-white py-2.5 rounded-xl font-semibold hover:shadow-lg transition disabled:opacity-50">
              {saving ? 'Enregistrement...' : editing ? 'Enregistrer' : 'Créer'}
            </button>
          </div>
        }
      >
        <form id="flag-form" onSubmit={save} className="space-y-4">
          {error && <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">{error}</div>}

          <FormField label="Clé (identifiant technique)" required hint="Minuscules, underscores. Ne peut plus changer après création.">
            <Input type="text" value={key} onChange={(e) => setKey(e.target.value)} placeholder="spa_module" className="font-mono" disabled={!!editing} required />
          </FormField>

          <FormField label="Label affiché" required>
            <Input type="text" value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Module Spa" required />
          </FormField>

          <FormField label="Description">
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} placeholder="À quoi sert ce flag..." />
          </FormField>

          <div className="flex gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={defaultEnabled} onChange={(e) => setDefaultEnabled(e.target.checked)} className="w-4 h-4 rounded text-teal-600" />
              <span className="text-sm font-medium text-slate-700">Activé par défaut</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} className="w-4 h-4 rounded text-teal-600" />
              <span className="text-sm font-medium text-slate-700">Flag actif</span>
            </label>
          </div>
        </form>
      </Modal>

      {/* Modal overrides par tenant */}
      <Modal
        open={!!overrideModal}
        onClose={() => setOverrideModal(null)}
        title={'Tenants — ' + (overrideModal?.label || '')}
        subtitle={overrideModal?.key}
        icon={<span className="text-2xl">🏢</span>}
        size="lg"
        footer={<div className="flex justify-end"><Button variant="secondary" onClick={() => setOverrideModal(null)}>Fermer</Button></div>}
      >
        {overrideModal && (
          <div className="space-y-2">
            {orgs.length === 0 ? (
              <p className="text-center text-slate-400 py-8 text-sm">Aucune organisation</p>
            ) : (
              orgs.map((o) => {
                const override = overrideModal.overrides.find((x: any) => x.organizationId === o.id);
                const effective = override ? override.enabled : overrideModal.defaultEnabled;
                const isOverride = !!override;
                return (
                  <div key={o.id} className={'flex items-center gap-3 p-3 rounded-xl border-2 transition ' + (effective ? 'border-emerald-400 bg-emerald-50' : 'border-slate-200 bg-white')}>
                    <div className={'w-9 h-9 rounded-lg flex items-center justify-center font-black text-sm shrink-0 ' + (effective ? 'bg-emerald-500 text-white' : 'bg-slate-200 text-slate-500')}>
                      {o.name?.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-slate-900 text-sm truncate">{o.name}</p>
                      <p className="text-[10px] text-slate-500">
                        {o.type || 'N/A'}
                        {isOverride && <span className="ml-2 font-bold text-amber-600">· OVERRIDE</span>}
                        {!isOverride && <span className="ml-2 text-slate-400">· défaut</span>}
                      </p>
                    </div>
                    <div className="flex gap-1.5 shrink-0">
                      <button
                        onClick={() => setOverride(o.id, true)}
                        className={'px-3 py-1.5 rounded-lg text-xs font-bold transition ' + (effective ? 'bg-emerald-500 text-white shadow' : 'bg-white border border-slate-200 text-slate-500 hover:border-emerald-400')}
                      >
                        ON
                      </button>
                      <button
                        onClick={() => setOverride(o.id, false)}
                        className={'px-3 py-1.5 rounded-lg text-xs font-bold transition ' + (!effective ? 'bg-slate-700 text-white shadow' : 'bg-white border border-slate-200 text-slate-500 hover:border-slate-400')}
                      >
                        OFF
                      </button>
                      {isOverride && (
                        <button onClick={() => removeOverride(o.id)} className="px-2 py-1.5 rounded-lg text-xs font-bold text-red-600 hover:bg-red-50 transition" title="Retirer l'override">
                          ↺
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </Modal>

      <ConfirmDialog
        open={!!toDelete}
        title="Supprimer le flag"
        message={`Supprimer "${toDelete?.label}" et tous ses overrides ?`}
        onClose={() => setToDelete(null)}
        onConfirm={confirmDelete}
      />
    </div>
  );
}
