'use client';

import { useEffect, useState } from 'react';
import { apiFetch } from '../lib/api';

const EVENT_META: Record<string, { icon: string; color: string; bg: string }> = {
  MODULE_ADDED:    { icon: '➕', color: '#10b981', bg: 'bg-emerald-100' },
  MODULE_REMOVED:  { icon: '➖', color: '#dc2626', bg: 'bg-red-100' },
  UPGRADE:         { icon: '⬆️', color: '#3b82f6', bg: 'bg-blue-100' },
  DOWNGRADE:       { icon: '⬇️', color: '#f59e0b', bg: 'bg-amber-100' },
  STATUS_CHANGED:  { icon: '🔄', color: '#8b5cf6', bg: 'bg-purple-100' },
};

function eventMeta(type: string) {
  return EVENT_META[type] || { icon: '📌', color: '#64748b', bg: 'bg-slate-100' };
}

function timeAgo(d: string) {
  const diff = Date.now() - new Date(d).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return "à l'instant";
  if (min < 60) return `il y a ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `il y a ${h}h`;
  return `il y a ${Math.floor(h / 24)}j`;
}

function dateLabel(d: string) {
  const dt = new Date(d);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const dd = new Date(dt);
  dd.setHours(0, 0, 0, 0);

  if (dd.getTime() === today.getTime()) return "Aujourd'hui";
  if (dd.getTime() === yesterday.getTime()) return 'Hier';
  return dt.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}

function dayKey(d: string) {
  const dt = new Date(d);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
}

export default function SubscriptionHistoryDrawer({ subscriptionId, orgName, onClose }: any) {
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : '';

  useEffect(() => {
    if (!subscriptionId) return;
    setLoading(true);
    apiFetch(`/api/subscriptions/${subscriptionId}/events`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((d) => setEvents(Array.isArray(d) ? d : []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [subscriptionId, token]);

  // Group par jour
  const grouped: Record<string, { label: string; items: any[] }> = {};
  events.forEach((e) => {
    const key = dayKey(e.createdAt);
    if (!grouped[key]) {
      grouped[key] = { label: dateLabel(e.createdAt), items: [] };
    }
    grouped[key].items.push(e);
  });
  const sortedGroups = Object.entries(grouped).sort((a, b) => b[0].localeCompare(a[0]));

  return (
    <div className="fixed inset-0 z-[100] flex justify-end">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-md bg-white shadow-2xl h-full overflow-hidden flex flex-col animate-in slide-in-from-right duration-200">
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 to-slate-800 px-6 py-5 text-white">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest mb-1">
                Historique du contrat
              </p>
              <h2 className="text-xl font-black truncate">{orgName}</h2>
            </div>
            <button
              onClick={onClose}
              className="w-9 h-9 rounded-full bg-white/15 hover:bg-white/25 flex items-center justify-center text-xl shrink-0 transition"
            >
              ×
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="flex justify-center items-center h-40">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-teal-500 border-t-transparent" />
            </div>
          ) : events.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center text-3xl mx-auto mb-3">
                📭
              </div>
              <p className="text-slate-500 font-medium">Aucun événement</p>
              <p className="text-xs text-slate-400 mt-1">
                Les modifications d'abonnement apparaîtront ici
              </p>
            </div>
          ) : (
            <div className="space-y-5">
              {sortedGroups.map(([key, group]) => (
                <div key={key}>
                  {/* Header jour */}
                  <div className="flex items-center gap-3 mb-3">
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest capitalize">
                      {group.label}
                    </p>
                    <div className="flex-1 h-px bg-slate-200" />
                    <span className="text-[10px] text-slate-400 font-bold">
                      {group.items.length}
                    </span>
                  </div>

                  {/* Items */}
                  <div className="relative pl-6 space-y-3">
                    {/* Ligne verticale */}
                    <div className="absolute left-2 top-2 bottom-2 w-0.5 bg-slate-200" />

                    {group.items.map((e) => {
                      const meta = eventMeta(e.type);
                      return (
                        <div key={e.id} className="relative">
                          {/* Point */}
                          <div
                            className="absolute -left-4 top-1 w-3 h-3 rounded-full border-2 border-white"
                            style={{ background: meta.color }}
                          />
                          <div className="bg-slate-50 rounded-lg p-3 border border-slate-200">
                            <div className="flex items-start gap-2">
                              <span className="text-base shrink-0">{meta.icon}</span>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-bold text-slate-900">{e.description}</p>
                                <div className="flex items-center gap-2 mt-1 text-[10px] text-slate-400">
                                  <span>{timeAgo(e.createdAt)}</span>
                                  {e.actor && (
                                    <>
                                      <span>·</span>
                                      <span>par {e.actor.name || e.actor.email}</span>
                                    </>
                                  )}
                                </div>
                                {e.oldValue && e.newValue && (
                                  <div className="flex items-center gap-1.5 mt-2 text-[10px]">
                                    <span className="px-1.5 py-0.5 rounded bg-red-100 text-red-700 font-bold">
                                      {e.oldValue}
                                    </span>
                                    <span className="text-slate-400">→</span>
                                    <span className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700 font-bold">
                                      {e.newValue}
                                    </span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
