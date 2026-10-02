'use client';

import { useState, useEffect } from 'react';
import { apiFetch } from '../../../lib/api';
import ConfirmDialog from '../../../components/ConfirmDialog';

const SCOPE_META: Record<string, { label: string; color: string; bg: string; desc: string }> = {
  READ:  { label: 'Lecture',  color: '#3b82f6', bg: 'bg-blue-100',  desc: 'Consulter les données' },
  WRITE: { label: 'Écriture', color: '#f59e0b', bg: 'bg-amber-100', desc: 'Créer et modifier' },
  ADMIN: { label: 'Admin',    color: '#dc2626', bg: 'bg-red-100',   desc: 'Contrôle total' },
};

function timeAgo(d: string | null) {
  if (!d) return 'Jamais';
  const diff = Date.now() - new Date(d).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return "à l'instant";
  if (min < 60) return `il y a ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `il y a ${h}h`;
  return `il y a ${Math.floor(h / 24)}j`;
}

export default function ApiKeysPage() {
  const [user, setUser] = useState<any>(null);
  const [keys, setKeys] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [toDelete, setToDelete] = useState<any>(null);
  const [toKill, setToKill] = useState<any>(null);
  const [toReactivate, setToReactivate] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newKey, setNewKey] = useState<any>(null);
  const [copied, setCopied] = useState(false);

  const [name, setName] = useState('');
  const [scopes, setScopes] = useState<string[]>(['READ']);
  const [expiresAt, setExpiresAt] = useState('');

  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : '';
  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  async function load() {
    const [me, k] = await Promise.all([
      apiFetch('/api/auth/me', { headers }).then((r) => r.json()),
      apiFetch('/api/api-keys', { headers }).then((r) => r.json()),
    ]);
    setUser(me);
    setKeys(Array.isArray(k) ? k : []);
  }

  useEffect(() => { load().catch(console.error).finally(() => setLoading(false)); }, []);

  const isSuperAdmin = user?.role === 'SUPER_ADMIN' && user?.isOwner;

  function showToast(m: string) { setToast(m); setTimeout(() => setToast(null), 3000); }

  function resetForm() {
    setEditing(null); setName(''); setScopes(['READ']); setExpiresAt(''); setError(null);
  }

  function openCreate() { resetForm(); setShowModal(true); }

  function openEdit(k: any) {
    setEditing(k); setName(k.name); setScopes(k.scopes); 
    setExpiresAt(k.expiresAt ? k.expiresAt.slice(0, 16) : ''); setError(null);
    setShowModal(true);
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setError(null); setSaving(true);
    const method = editing ? 'PATCH' : 'POST';
    const url = editing ? `/api/api-keys/${editing.id}` : '/api/api-keys';
    const res = await apiFetch(url, {
      method, headers,
      body: JSON.stringify({
        name, scopes,
        expiresAt: expiresAt ? new Date(expiresAt).toISOString() : null,
      }),
    });
    setSaving(false);
    if (res.ok) {
      const data = await res.json();
      setShowModal(false);
      resetForm();
      await load();
      if (!editing && data.key) {
        setNewKey(data);
        setCopied(false);
      } else {
        showToast('Clé mise à jour');
      }
    } else {
      const d = await res.json();
      setError(d.message || 'Erreur');
    }
  }

  async function confirmDelete() {
    if (!toDelete) return;
    await apiFetch(`/api/api-keys/${toDelete.id}`, { method: 'DELETE', headers });
    setToDelete(null); showToast('Clé supprimée'); await load();
  }

  async function confirmKillSwitch() {
    if (!toKill) return;
    await apiFetch(`/api/api-keys/${toKill.id}/kill-switch`, { method: 'POST', headers });
    setToKill(null); showToast('⚠️ Clé désactivée d\'urgence'); await load();
  }

  async function confirmReactivate() {
    if (!toReactivate) return;
    await apiFetch(`/api/api-keys/${toReactivate.id}/reactivate`, { method: 'POST', headers });
    setToReactivate(null); showToast('Clé réactivée'); await load();
  }

  function toggleScope(s: string) {
    setScopes((prev) => prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]);
  }

  function copyKey() {
    if (!newKey?.key) return;
    navigator.clipboard.writeText(newKey.key);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (loading) {
    return <div className="flex justify-center items-center h-64"><div className="animate-spin rounded-full h-10 w-10 border-4 border-teal-400 border-t-transparent"></div></div>;
  }

  return (
    <div className="space-y-5 max-w-5xl mx-auto">
      {toast && <div className="fixed top-20 right-4 z-[100] bg-slate-900 text-white px-4 py-3 rounded-xl shadow-2xl text-sm font-medium">{toast}</div>}

      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <p className="text-xs font-black text-teal-600 uppercase tracking-widest mb-1">
            {isSuperAdmin ? 'Audit' : 'Développeurs'}
          </p>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            {isSuperAdmin ? 'Clés API des tenants' : 'Clés API'}
          </h1>
          <p className="text-slate-500 mt-1">
            {keys.length} clé{keys.length > 1 ? 's' : ''} · {isSuperAdmin ? 'surveillance de sécurité' : 'accédez à vos données'}
          </p>
        </div>
        {!isSuperAdmin && (
          <button
            onClick={openCreate}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-blue-600 to-teal-500 hover:shadow-lg text-white rounded-xl font-black text-sm transition shrink-0"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" />
            </svg>
            Nouvelle clé
          </button>
        )}
      </div>

      {/* Info box conditionnelle */}
      {isSuperAdmin ? (
        <div className="bg-purple-50 border border-purple-200 rounded-2xl p-4">
          <p className="text-[10px] text-purple-700 uppercase font-black tracking-widest mb-1.5">🛡️ Mode audit</p>
          <ul className="text-xs text-purple-800 space-y-1">
            <li>• Vous voyez toutes les clés API de tous les tenants (audit de sécurité)</li>
            <li>• Vous pouvez <strong>désactiver d'urgence</strong> (kill switch) une clé compromise</li>
            <li>• Pour modifier/supprimer, utilisez l'<strong>impersonation</strong> depuis la page Organisations (action tracée)</li>
          </ul>
        </div>
      ) : (
        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4">
          <p className="text-[10px] text-blue-700 uppercase font-black tracking-widest mb-1.5">ℹ️ À propos</p>
          <ul className="text-xs text-blue-800 space-y-1">
            <li>• Une clé API permet à vos outils externes (Excel, site web, Zapier…) de lire/écrire vos données</li>
            <li>• La clé en clair n'est affichée <strong>qu'une seule fois</strong> à la création</li>
            <li>• Utilisation : header <code className="bg-white px-1.5 rounded">X-API-Key: nexus_live_…</code></li>
          </ul>
        </div>
      )}

      {keys.length === 0 ? (
        <div className="bg-white rounded-2xl border-2 border-dashed border-slate-200 p-16 text-center">
          <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center text-3xl mx-auto mb-3">🔑</div>
          <p className="text-lg font-bold text-slate-700 mb-1">
            {isSuperAdmin ? 'Aucune clé API active' : 'Aucune clé API'}
          </p>
          <p className="text-sm text-slate-400 mb-4">
            {isSuperAdmin ? 'Toutes les clés des tenants apparaîtront ici' : 'Générez votre première clé pour intégrer NEXUS OS'}
          </p>
          {!isSuperAdmin && (
            <button onClick={openCreate} className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-blue-600 to-teal-500 hover:shadow-lg text-white rounded-xl font-bold text-sm transition">
              + Nouvelle clé
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {keys.map((k) => (
            <div key={k.id} className={'bg-white rounded-2xl border-2 overflow-hidden transition ' + (k.isActive ? 'border-slate-200 hover:border-teal-300' : 'border-slate-200 opacity-60')}>
              <div className="flex items-start gap-4 p-5">
                <div className={'w-12 h-12 rounded-xl flex items-center justify-center text-2xl shrink-0 ' + (k.isActive ? 'bg-teal-100 text-teal-700' : 'bg-slate-100 text-slate-400')}>
                  🔑
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <h3 className="font-black text-slate-900 text-base truncate">{k.name}</h3>
                    {!k.isActive && <span className="text-[9px] font-black tracking-widest px-2 py-0.5 rounded bg-red-100 text-red-700">DÉSACTIVÉE</span>}
                    {k.expiresAt && new Date(k.expiresAt) < new Date() && (
                      <span className="text-[9px] font-black tracking-widest px-2 py-0.5 rounded bg-slate-200 text-slate-600">EXPIRÉE</span>
                    )}
                  </div>
                  {isSuperAdmin && k.organization && (
                    <p className="text-xs font-bold text-slate-600 mb-1">
                      🏢 {k.organization.name}
                    </p>
                  )}
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    <span className="font-mono text-xs font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
                      {k.prefix}…
                    </span>
                    {k.scopes.map((s: string) => (
                      <span key={s} className={'text-[9px] font-black tracking-widest px-2 py-0.5 rounded ' + SCOPE_META[s]?.bg} style={{ color: SCOPE_META[s]?.color }}>
                        {SCOPE_META[s]?.label.toUpperCase()}
                      </span>
                    ))}
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-slate-400">
                    <span>Dernière utilisation : <strong className="text-slate-600">{timeAgo(k.lastUsedAt)}</strong></span>
                    <span>Créée : {new Date(k.createdAt).toLocaleDateString('fr-FR')}</span>
                    {k.createdBy && <span>par {k.createdBy.name || k.createdBy.email}</span>}
                  </div>
                </div>

                {/* Actions selon le rôle */}
                <div className="flex gap-1.5 shrink-0">
                  {isSuperAdmin ? (
                    // Super Admin : kill switch + reactivate
                    k.isActive ? (
                      <button
                        onClick={() => setToKill(k)}
                        className="px-3 py-2 rounded-lg bg-red-500 hover:bg-red-600 text-white text-xs font-black transition inline-flex items-center gap-1.5"
                        title="Désactiver d'urgence"
                      >
                        🚨 Kill switch
                      </button>
                    ) : (
                      <button
                        onClick={() => setToReactivate(k)}
                        className="px-3 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-black transition inline-flex items-center gap-1.5"
                        title="Réactiver"
                      >
                        ↺ Réactiver
                      </button>
                    )
                  ) : (
                    // Tenant : modifier + supprimer
                    <>
                      <button onClick={() => openEdit(k)} className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-blue-100 text-slate-500 hover:text-blue-600 flex items-center justify-center transition" title="Modifier">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                      </button>
                      <button onClick={() => setToDelete(k)} className="w-8 h-8 rounded-lg bg-red-50 hover:bg-red-100 text-red-500 flex items-center justify-center transition" title="Supprimer">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M1 7h22M9 7V4a2 2 0 012-2h2a2 2 0 012 2v3" /></svg>
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal création / édition (tenant uniquement) */}
      {showModal && !isSuperAdmin && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => { setShowModal(false); resetForm(); }}></div>
          <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden max-h-[92vh] flex flex-col">
            <div className="bg-gradient-to-r from-slate-900 via-blue-900 to-teal-900 px-6 py-5 text-white">
              <h2 className="text-xl font-black">{editing ? 'Modifier la clé' : 'Nouvelle clé API'}</h2>
              <p className="text-xs text-blue-200 mt-1">Configurez les accès</p>
            </div>
            <form onSubmit={save} className="p-6 space-y-4 overflow-y-auto">
              {error && <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">{error}</div>}

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Nom <span className="text-red-500">*</span></label>
                <input type="text" value={name} onChange={(e) => setName(e.target.value)} required placeholder="Intégration Excel" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:ring-2 focus:ring-teal-400" />
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Permissions</label>
                <div className="space-y-2">
                  {Object.entries(SCOPE_META).map(([key, meta]) => (
                    <label key={key} className={'flex items-start gap-3 p-3 rounded-xl border-2 cursor-pointer transition ' + (scopes.includes(key) ? 'border-teal-400 bg-teal-50' : 'border-slate-200 hover:border-slate-400')}>
                      <input type="checkbox" checked={scopes.includes(key)} onChange={() => toggleScope(key)} className="mt-1 w-4 h-4 rounded text-teal-600" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className={'text-[10px] font-black tracking-widest px-2 py-0.5 rounded ' + meta.bg} style={{ color: meta.color }}>
                            {meta.label.toUpperCase()}
                          </span>
                        </div>
                        <p className="text-xs text-slate-600">{meta.desc}</p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Date d'expiration (optionnel)</label>
                <input type="datetime-local" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900" />
                <p className="text-xs text-slate-400 mt-1">Laisser vide = pas d'expiration</p>
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => { setShowModal(false); resetForm(); }} className="px-5 py-3 bg-white border-2 border-slate-200 rounded-xl font-bold text-sm text-slate-700 hover:bg-slate-100 transition">
                  Annuler
                </button>
                <button type="submit" disabled={saving || scopes.length === 0} className="flex-1 bg-gradient-to-r from-blue-600 to-teal-500 hover:shadow-lg text-white rounded-xl font-black text-sm transition disabled:opacity-50">
                  {saving ? 'Génération...' : editing ? 'Enregistrer' : 'Générer la clé'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal clé affichée une seule fois */}
      {newKey && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-md"></div>
          <div className="relative w-full max-w-xl bg-white rounded-2xl shadow-2xl overflow-hidden">
            <div className="bg-gradient-to-r from-emerald-600 to-teal-500 px-6 py-5 text-white">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-2xl">🔑</div>
                <div>
                  <h2 className="text-xl font-black">Votre clé API est prête</h2>
                  <p className="text-xs text-emerald-100 mt-0.5">Copiez-la maintenant — elle ne sera plus jamais affichée</p>
                </div>
              </div>
            </div>
            <div className="p-6 space-y-4">
              <div className="bg-amber-50 border-2 border-amber-300 rounded-xl p-3 flex items-start gap-3">
                <span className="text-xl shrink-0">⚠️</span>
                <p className="text-xs text-amber-800 leading-relaxed">
                  <strong>Fermez cette fenêtre uniquement après avoir copié la clé.</strong> Pour raisons de sécurité, nous ne stockons qu'un hash.
                </p>
              </div>
              <div className="bg-slate-900 rounded-xl p-4">
                <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest mb-2">Votre clé API</p>
                <div className="font-mono text-sm text-teal-300 break-all leading-relaxed">{newKey.key}</div>
              </div>
              <div className="flex gap-2">
                <button onClick={copyKey} className={'flex-1 py-3 rounded-xl font-black text-sm transition ' + (copied ? 'bg-emerald-500 text-white' : 'bg-slate-900 hover:bg-slate-800 text-white')}>
                  {copied ? '✓ Copiée !' : '📋 Copier la clé'}
                </button>
                <button onClick={() => { setNewKey(null); showToast('Clé générée'); }} className="px-5 py-3 bg-white border-2 border-slate-200 rounded-xl font-bold text-sm text-slate-700 hover:bg-slate-100 transition">
                  J'ai copié, fermer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={!!toDelete}
        title="Supprimer la clé"
        message={`Supprimer définitivement "${toDelete?.name}" ? Toutes les intégrations utilisant cette clé cesseront de fonctionner.`}
        onClose={() => setToDelete(null)}
        onConfirm={confirmDelete}
      />

      <ConfirmDialog
        open={!!toKill}
        title="🚨 Kill switch — Désactiver d'urgence"
        message={`Désactiver immédiatement la clé "${toKill?.name}" de ${toKill?.organization?.name} ? Action tracée dans l'audit. Les intégrations du tenant cesseront de fonctionner.`}
        onClose={() => setToKill(null)}
        onConfirm={confirmKillSwitch}
        confirmLabel="🚨 Désactiver la clé"
        loadingLabel="Désactivation..."
        variant="danger"
      />

      <ConfirmDialog
        open={!!toReactivate}
        title="Réactiver la clé"
        message={`Réactiver la clé "${toReactivate?.name}" de ${toReactivate?.organization?.name} ?`}
        onClose={() => setToReactivate(null)}
        onConfirm={confirmReactivate}
        confirmLabel="↺ Réactiver"
        loadingLabel="Réactivation..."
        variant="success"
      />
    </div>
  );
}
