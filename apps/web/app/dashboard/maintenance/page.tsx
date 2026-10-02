'use client';

import { useState, useEffect } from 'react';
import { apiFetch } from '../../../lib/api';

export default function MaintenanceAdminPage() {
  const [config, setConfig] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const [isActive, setIsActive] = useState(false);
  const [message, setMessage] = useState('');
  const [scheduledStart, setScheduledStart] = useState('');
  const [scheduledEnd, setScheduledEnd] = useState('');

  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : '';
  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  async function load() {
    const res = await apiFetch('/api/maintenance', { headers });
    const d = await res.json();
    setConfig(d);
    setIsActive(!!d.isActive);
    setMessage(d.message || '');
    setScheduledStart(d.scheduledStart ? d.scheduledStart.slice(0, 16) : '');
    setScheduledEnd(d.scheduledEnd ? d.scheduledEnd.slice(0, 16) : '');
  }

  useEffect(() => { load().catch(console.error).finally(() => setLoading(false)); }, []);

  function showToast(m: string) { setToast(m); setTimeout(() => setToast(null), 2500); }

  async function save() {
    setSaving(true);
    const res = await apiFetch('/api/maintenance', {
      method: 'PATCH', headers,
      body: JSON.stringify({
        isActive,
        message,
        scheduledStart: scheduledStart ? new Date(scheduledStart).toISOString() : null,
        scheduledEnd: scheduledEnd ? new Date(scheduledEnd).toISOString() : null,
      }),
    });
    setSaving(false);
    if (res.ok) {
      showToast('Configuration enregistrée');
      await load();
    }
  }

  async function toggleNow() {
    setSaving(true);
    const res = await apiFetch('/api/maintenance', {
      method: 'PATCH', headers,
      body: JSON.stringify({ isActive: !isActive }),
    });
    setSaving(false);
    if (res.ok) {
      showToast(isActive ? '✅ Plateforme rétablie' : '🚧 Maintenance activée');
      await load();
    }
  }

  if (loading) {
    return <div className="flex justify-center items-center h-64"><div className="animate-spin rounded-full h-10 w-10 border-4 border-teal-400 border-t-transparent"></div></div>;
  }

  const now = new Date();
  const scheduled = config?.scheduledStart && config?.scheduledEnd
    && now >= new Date(config.scheduledStart) && now <= new Date(config.scheduledEnd);
  const isOn = config?.isActive || scheduled;

  return (
    <div className="space-y-5 max-w-3xl">
      {toast && <div className="fixed top-20 right-4 z-[100] bg-slate-900 text-white px-4 py-3 rounded-xl shadow-2xl text-sm font-medium">{toast}</div>}

      <div>
        <p className="text-xs font-black text-teal-600 uppercase tracking-widest mb-1">Opérations</p>
        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">Maintenance</h1>
        <p className="text-slate-500 mt-1">Activez un mode maintenance pour bloquer l accès des tenants</p>
      </div>

      {/* Statut actuel */}
      <div className={'rounded-2xl border-2 p-5 ' + (isOn ? 'bg-red-50 border-red-300' : 'bg-emerald-50 border-emerald-300')}>
        <div className="flex items-center gap-4">
          <div className={'w-12 h-12 rounded-xl flex items-center justify-center text-2xl shrink-0 ' + (isOn ? 'bg-red-500 text-white' : 'bg-emerald-500 text-white')}>
            {isOn ? '🚧' : '✅'}
          </div>
          <div className="flex-1">
            <p className="text-[10px] uppercase font-black tracking-widest text-slate-500 mb-0.5">Statut actuel</p>
            <h2 className={'text-2xl font-black ' + (isOn ? 'text-red-700' : 'text-emerald-700')}>
              {isOn ? 'MAINTENANCE EN COURS' : 'Plateforme opérationnelle'}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {config?.isActive ? 'Activée manuellement' : scheduled ? 'Planifiée' : 'Aucune maintenance active'}
            </p>
          </div>
          <button
            onClick={toggleNow}
            disabled={saving}
            className={'px-5 py-3 rounded-xl font-black text-sm shadow-lg transition disabled:opacity-50 ' + (
              isOn
                ? 'bg-emerald-500 hover:bg-emerald-600 text-white'
                : 'bg-red-500 hover:bg-red-600 text-white'
            )}
          >
            {isOn ? '✓ Rétablir' : '🚧 Activer maintenant'}
          </button>
        </div>
      </div>

      {/* Message */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
        <div>
          <label className="block text-sm font-bold text-slate-700 mb-2">Message affiché aux utilisateurs</label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={3}
            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:ring-2 focus:ring-teal-400 focus:border-teal-400 resize-none"
            placeholder="La plateforme est en maintenance. Merci de revenir dans quelques minutes."
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">Début planifié</label>
            <input
              type="datetime-local"
              value={scheduledStart}
              onChange={(e) => setScheduledStart(e.target.value)}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:ring-2 focus:ring-teal-400 focus:border-teal-400"
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">Fin planifiée</label>
            <input
              type="datetime-local"
              value={scheduledEnd}
              onChange={(e) => setScheduledEnd(e.target.value)}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:ring-2 focus:ring-teal-400 focus:border-teal-400"
            />
          </div>
        </div>

        <div className="flex items-center justify-between pt-3 border-t border-slate-100">
          <p className="text-xs text-slate-500">
            💡 Le toggle manuel est instantané. La planification se déclenche automatiquement.
          </p>
          <button
            onClick={save}
            disabled={saving}
            className="px-5 py-2.5 bg-linear-to-r from-blue-600 to-teal-500 hover:shadow-lg text-white rounded-xl font-black text-sm transition disabled:opacity-50"
          >
            {saving ? 'Enregistrement...' : 'Enregistrer'}
          </button>
        </div>
      </div>

      {/* Info */}
      <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4">
        <p className="text-[10px] text-blue-700 uppercase font-black tracking-widest mb-1.5">ℹ️ Ce qui est bloqué en mode maintenance</p>
        <ul className="text-xs text-blue-800 space-y-1">
          <li>• Les tenants voient la page <code className="bg-white px-1.5 rounded">/maintenance</code> avec votre message</li>
          <li>• Toutes leurs requêtes API renvoient <code className="bg-white px-1.5 rounded">503 MAINTENANCE_MODE</code></li>
          <li>• Le SUPER_ADMIN conserve un accès complet</li>
          <li>• Les routes publiques (health, login, refresh) restent accessibles</li>
        </ul>
      </div>
    </div>
  );
}
