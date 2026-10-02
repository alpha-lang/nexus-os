'use client';

import { useState, useEffect } from 'react';
import { apiFetch } from '../../../lib/api';
import ConfirmDialog from '../../../components/ConfirmDialog';

const EVENT_GROUPS: Record<string, string[]> = {
  'Réservations': ['reservation.created', 'reservation.updated', 'reservation.cancelled', 'reservation.checked_in', 'reservation.checked_out'],
  'Partenaires': ['partner.created', 'partner.updated'],
  'Ventes': ['sale.completed', 'pos.sale_completed'],
  'Stock': ['stock.low', 'stock.out', 'stock.movement'],
  'Paiements': ['payment.received'],
  'Caisse': ['cash.session_opened', 'cash.session_closed'],
  'Support': ['ticket.created', 'ticket.resolved'],
};

const EVENT_LABEL: Record<string, string> = {
  'reservation.created': '📅 Réservation créée',
  'reservation.updated': '📝 Réservation modifiée',
  'reservation.cancelled': '❌ Réservation annulée',
  'reservation.checked_in': '🛎️ Check-in',
  'reservation.checked_out': '👋 Check-out',
  'partner.created': '👤 Partenaire créé',
  'partner.updated': '📝 Partenaire modifié',
  'sale.completed': '💰 Vente',
  'pos.sale_completed': '🛒 Vente POS',
  'stock.low': '⚠️ Stock bas',
  'stock.out': '🚨 Rupture stock',
  'stock.movement': '📦 Mouvement stock',
  'payment.received': '💳 Paiement reçu',
  'cash.session_opened': '🔓 Caisse ouverte',
  'cash.session_closed': '🔒 Caisse fermée',
  'ticket.created': '🎫 Ticket créé',
  'ticket.resolved': '✅ Ticket résolu',
};

export default function WebhooksPage() {
  const [webhooks, setWebhooks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [toDelete, setToDelete] = useState<any>(null);
  const [detailsFor, setDetailsFor] = useState<any>(null);
  const [deliveries, setDeliveries] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [testing, setTesting] = useState<string | null>(null);

  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [events, setEvents] = useState<string[]>([]);
  const [isActive, setIsActive] = useState(true);

  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : '';
  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  async function load() {
    const res = await apiFetch('/api/webhooks', { headers });
    const d = await res.json();
    setWebhooks(Array.isArray(d) ? d : []);
  }

  useEffect(() => { load().catch(console.error).finally(() => setLoading(false)); }, []);

  function showToast(m: string) { setToast(m); setTimeout(() => setToast(null), 3000); }

  function resetForm() {
    setEditing(null); setName(''); setUrl(''); setEvents([]); setIsActive(true); setError(null);
  }

  function openCreate() { resetForm(); setShowModal(true); }

  function openEdit(w: any) {
    setEditing(w); setName(w.name); setUrl(w.url); setEvents(w.events || []); setIsActive(w.isActive); setError(null);
    setShowModal(true);
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setError(null); setSaving(true);
    const method = editing ? 'PATCH' : 'POST';
    const url_ = editing ? `/api/webhooks/${editing.id}` : '/api/webhooks';
    const res = await apiFetch(url_, {
      method, headers,
      body: JSON.stringify({ name, url, events, isActive }),
    });
    setSaving(false);
    if (res.ok) {
      showToast(editing ? 'Webhook mis à jour' : 'Webhook créé');
      setShowModal(false); resetForm(); await load();
    } else {
      const d = await res.json();
      setError(d.message || 'Erreur');
    }
  }

  async function confirmDelete() {
    if (!toDelete) return;
    await apiFetch(`/api/webhooks/${toDelete.id}`, { method: 'DELETE', headers });
    setToDelete(null); showToast('Webhook supprimé'); await load();
  }

  async function testWebhook(id: string) {
    setTesting(id);
    const res = await apiFetch(`/api/webhooks/${id}/test`, { method: 'POST', headers });
    setTesting(null);
    if (res.ok) {
      const r = await res.json();
      showToast(r.succeeded ? '✅ Test envoyé avec succès' : `❌ Échec : ${r.statusCode || r.errorMessage}`);
    }
  }

  async function openDetails(w: any) {
    setDetailsFor(w);
    const res = await apiFetch(`/api/webhooks/${w.id}/deliveries?take=20`, { headers });
    const d = await res.json();
    setDeliveries(Array.isArray(d) ? d : []);
  }

  async function retryDelivery(id: string) {
    const res = await apiFetch(`/api/webhooks/deliveries/${id}/retry`, { method: 'POST', headers });
    if (res.ok) {
      showToast('Retry effectué');
      if (detailsFor) await openDetails(detailsFor);
    }
  }

  function toggleEvent(ev: string) {
    setEvents((prev) => prev.includes(ev) ? prev.filter((x) => x !== ev) : [...prev, ev]);
  }

  function toggleGroup(evts: string[]) {
    const allIn = evts.every((e) => events.includes(e));
    if (allIn) setEvents((prev) => prev.filter((e) => !evts.includes(e)));
    else setEvents((prev) => Array.from(new Set([...prev, ...evts])));
  }

  if (loading) {
    return <div className="flex justify-center items-center h-64"><div className="animate-spin rounded-full h-10 w-10 border-4 border-teal-400 border-t-transparent"></div></div>;
  }

  return (
    <div className="space-y-5 max-w-5xl mx-auto">
      {toast && <div className="fixed top-20 right-4 z-[100] bg-slate-900 text-white px-4 py-3 rounded-xl shadow-2xl text-sm font-medium">{toast}</div>}

      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <p className="text-xs font-black text-teal-600 uppercase tracking-widest mb-1">Intégrations</p>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">Webhooks</h1>
          <p className="text-slate-500 mt-1">
            {webhooks.length} webhook{webhooks.length > 1 ? 's' : ''} · notifications HTTP vers vos outils externes
          </p>
        </div>
        <button onClick={openCreate} className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-blue-600 to-teal-500 hover:shadow-lg text-white rounded-xl font-black text-sm transition shrink-0">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" />
          </svg>
          Nouveau webhook
        </button>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4">
        <p className="text-[10px] text-blue-700 uppercase font-black tracking-widest mb-1.5">🔒 Sécurité</p>
        <ul className="text-xs text-blue-800 space-y-1">
          <li>• Chaque payload est signé : header <code className="bg-white px-1.5 rounded">X-Nexus-Signature: sha256=…</code></li>
          <li>• Vérifiez la signature avec votre secret (HMAC SHA-256)</li>
          <li>• Timeout : 10 secondes · Retry automatique en cas d'échec</li>
        </ul>
      </div>

      {webhooks.length === 0 ? (
        <div className="bg-white rounded-2xl border-2 border-dashed border-slate-200 p-16 text-center">
          <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center text-3xl mx-auto mb-3">🔔</div>
          <p className="text-lg font-bold text-slate-700 mb-1">Aucun webhook</p>
          <p className="text-sm text-slate-400 mb-4">Créez votre premier webhook pour recevoir les événements</p>
          <button onClick={openCreate} className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-blue-600 to-teal-500 hover:shadow-lg text-white rounded-xl font-bold text-sm transition">
            + Nouveau webhook
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {webhooks.map((w) => (
            <div key={w.id} className={'bg-white rounded-2xl border-2 overflow-hidden transition ' + (w.isActive ? 'border-slate-200 hover:border-teal-300' : 'border-slate-200 opacity-60')}>
              <div className="flex items-start gap-4 p-5">
                <div className={'w-12 h-12 rounded-xl flex items-center justify-center text-2xl shrink-0 ' + (w.lastStatus === 'OK' ? 'bg-emerald-100' : w.lastStatus === 'FAILED' ? 'bg-red-100' : 'bg-slate-100')}>
                  {w.lastStatus === 'OK' ? '✅' : w.lastStatus === 'FAILED' ? '❌' : '🔔'}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <h3 className="font-black text-slate-900 text-base truncate">{w.name}</h3>
                    {!w.isActive && <span className="text-[9px] font-black tracking-widest px-2 py-0.5 rounded bg-slate-200 text-slate-600">INACTIF</span>}
                    {w.failureCount > 0 && w.isActive && (
                      <span className="text-[9px] font-black tracking-widest px-2 py-0.5 rounded bg-red-100 text-red-700">
                        {w.failureCount} ÉCHECS
                      </span>
                    )}
                  </div>
                  <p className="text-xs font-mono text-slate-500 truncate mb-2">{w.url}</p>
                  <div className="flex flex-wrap gap-1">
                    {w.events.slice(0, 4).map((e: string) => (
                      <span key={e} className="text-[9px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-600">
                        {EVENT_LABEL[e] || e}
                      </span>
                    ))}
                    {w.events.length > 4 && <span className="text-[9px] text-slate-400 font-bold">+{w.events.length - 4}</span>}
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-[11px] text-slate-400">
                    <span>{w._count?.deliveries || 0} livraison{(w._count?.deliveries || 0) > 1 ? 's' : ''}</span>
                    {w.lastTriggeredAt && <span>Dernier : {new Date(w.lastTriggeredAt).toLocaleString('fr-FR')}</span>}
                  </div>
                </div>
                <div className="flex gap-1.5 shrink-0">
                  <button
                    onClick={() => testWebhook(w.id)}
                    disabled={testing === w.id}
                    className="px-3 py-2 rounded-lg bg-teal-50 hover:bg-teal-100 text-teal-700 text-xs font-bold transition disabled:opacity-50"
                  >
                    {testing === w.id ? '...' : 'Tester'}
                  </button>
                  <button onClick={() => openDetails(w)} className="px-3 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition">
                    Historique
                  </button>
                  <button onClick={() => openEdit(w)} className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-blue-100 text-slate-500 hover:text-blue-600 flex items-center justify-center transition">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                  </button>
                  <button onClick={() => setToDelete(w)} className="w-8 h-8 rounded-lg bg-red-50 hover:bg-red-100 text-red-500 flex items-center justify-center transition">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M1 7h22M9 7V4a2 2 0 012-2h2a2 2 0 012 2v3" /></svg>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal création/édition */}
      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => { setShowModal(false); resetForm(); }}></div>
          <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl overflow-hidden max-h-[92vh] flex flex-col">
            <div className="bg-gradient-to-r from-slate-900 via-blue-900 to-teal-900 px-6 py-5 text-white">
              <h2 className="text-xl font-black">{editing ? 'Modifier le webhook' : 'Nouveau webhook'}</h2>
              <p className="text-xs text-blue-200 mt-1">URL et événements à écouter</p>
            </div>
            <form onSubmit={save} className="p-6 space-y-4 overflow-y-auto">
              {error && <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">{error}</div>}

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Nom <span className="text-red-500">*</span></label>
                <input type="text" value={name} onChange={(e) => setName(e.target.value)} required placeholder="Sync Google Calendar" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:ring-2 focus:ring-teal-400" />
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">URL (HTTPS) <span className="text-red-500">*</span></label>
                <input type="url" value={url} onChange={(e) => setUrl(e.target.value)} required placeholder="https://hook.zapier.com/..." className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono text-slate-900 focus:ring-2 focus:ring-teal-400" />
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Événements à écouter ({events.length})</label>
                <div className="space-y-3 max-h-80 overflow-y-auto border border-slate-200 rounded-xl p-3">
                  {Object.entries(EVENT_GROUPS).map(([group, evts]) => {
                    const allIn = evts.every((e) => events.includes(e));
                    return (
                      <div key={group}>
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{group}</span>
                          <button type="button" onClick={() => toggleGroup(evts)} className="text-[10px] font-bold text-teal-600 hover:underline">
                            {allIn ? 'Tout décocher' : 'Tout cocher'}
                          </button>
                        </div>
                        <div className="grid grid-cols-2 gap-1.5">
                          {evts.map((e) => (
                            <label key={e} className={'flex items-center gap-2 p-2 rounded-lg cursor-pointer transition text-xs ' + (events.includes(e) ? 'bg-teal-50 text-teal-800' : 'hover:bg-slate-50 text-slate-600')}>
                              <input type="checkbox" checked={events.includes(e)} onChange={() => toggleEvent(e)} className="w-3.5 h-3.5 rounded text-teal-600" />
                              <span className="truncate">{EVENT_LABEL[e] || e}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {editing && (
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} className="w-4 h-4 rounded text-teal-600" />
                  <span className="text-sm font-medium text-slate-700">Webhook actif</span>
                </label>
              )}

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => { setShowModal(false); resetForm(); }} className="px-5 py-3 bg-white border-2 border-slate-200 rounded-xl font-bold text-sm text-slate-700 hover:bg-slate-100 transition">
                  Annuler
                </button>
                <button type="submit" disabled={saving || events.length === 0} className="flex-1 bg-gradient-to-r from-blue-600 to-teal-500 hover:shadow-lg text-white rounded-xl font-black text-sm transition disabled:opacity-50">
                  {saving ? 'Enregistrement...' : editing ? 'Enregistrer' : 'Créer le webhook'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Drawer historique */}
      {detailsFor && (
        <div className="fixed inset-0 z-[100] flex justify-end">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setDetailsFor(null)}></div>
          <div className="relative w-full max-w-3xl bg-white shadow-2xl h-full overflow-y-auto flex flex-col">
            <div className="bg-gradient-to-r from-slate-900 via-blue-900 to-teal-900 px-6 py-5 text-white sticky top-0 z-10">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-[10px] text-blue-200 uppercase font-black tracking-widest mb-1">Historique</p>
                  <h2 className="text-xl font-black truncate">{detailsFor.name}</h2>
                  <p className="text-xs text-blue-200 mt-1 font-mono truncate">{detailsFor.url}</p>
                </div>
                <button onClick={() => setDetailsFor(null)} className="w-9 h-9 rounded-full bg-white/15 hover:bg-white/25 flex items-center justify-center text-xl shrink-0">×</button>
              </div>
            </div>
            <div className="p-6 space-y-2">
              {deliveries.length === 0 ? (
                <p className="text-center text-sm text-slate-400 py-12">Aucune livraison pour le moment</p>
              ) : (
                deliveries.map((d) => (
                  <div key={d.id} className={'border-2 rounded-xl p-4 ' + (d.succeeded ? 'border-emerald-200 bg-emerald-50/50' : 'border-red-200 bg-red-50/50')}>
                    <div className="flex items-start gap-3">
                      <div className={'w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold shrink-0 ' + (d.succeeded ? 'bg-emerald-500' : 'bg-red-500')}>
                        {d.succeeded ? '✓' : '✗'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className="text-xs font-bold text-slate-900">{EVENT_LABEL[d.event] || d.event}</span>
                          {d.statusCode && (
                            <span className={'text-[10px] font-black px-2 py-0.5 rounded ' + (d.succeeded ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700')}>
                              HTTP {d.statusCode}
                            </span>
                          )}
                          <span className="text-[10px] text-slate-400">{d.durationMs}ms</span>
                        </div>
                        <p className="text-[10px] text-slate-500 mb-2">{new Date(d.createdAt).toLocaleString('fr-FR')}</p>
                        {d.errorMessage && (
                          <p className="text-xs text-red-700 font-mono bg-red-100 rounded p-2 mb-2">{d.errorMessage}</p>
                        )}
                        {d.responseBody && (
                          <p className="text-[10px] text-slate-500 font-mono bg-white rounded p-2 truncate">{d.responseBody}</p>
                        )}
                      </div>
                      <button onClick={() => retryDelivery(d.id)} className="px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-600 hover:bg-slate-100 text-xs font-bold transition shrink-0">
                        ↻ Retry
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={!!toDelete}
        title="Supprimer le webhook"
        message={`Supprimer "${toDelete?.name}" ? Les événements ne seront plus envoyés à cette URL.`}
        onClose={() => setToDelete(null)}
        onConfirm={confirmDelete}
      />
    </div>
  );
}
