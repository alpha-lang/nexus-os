'use client';

import { useEffect, useState } from 'react';
import { apiFetch } from '../lib/api';

const TYPE_META: Record<string, { label: string; icon: string; color: string }> = {
  FEATURE:     { label: 'Nouveauté',    icon: '✨', color: '#10b981' },
  FIX:         { label: 'Correction',   icon: '🐛', color: '#3b82f6' },
  IMPROVEMENT: { label: 'Amélioration', icon: '⚡', color: '#f59e0b' },
  BREAKING:    { label: 'Breaking',     icon: '⚠️', color: '#dc2626' },
};

export default function ChangelogDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    apiFetch('/api/changelog/public')
      .then((r) => r.ok ? r.json() : [])
      .then((d) => setItems(Array.isArray(d) ? d : []))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[110] flex justify-end">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose}></div>
      <div className="relative w-full max-w-md bg-white shadow-2xl h-full overflow-y-auto">
        <div className="bg-gradient-to-r from-slate-900 via-blue-900 to-teal-900 px-6 py-5 text-white sticky top-0 z-10">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-black">Nouveautés</h2>
              <p className="text-xs text-blue-200 mt-1">Les dernières évolutions de NEXUS OS</p>
            </div>
            <button onClick={onClose} className="w-9 h-9 rounded-full bg-white/15 hover:bg-white/25 flex items-center justify-center text-xl">×</button>
          </div>
        </div>

        <div className="p-4 space-y-3">
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-teal-500 border-t-transparent"></div>
            </div>
          ) : items.length === 0 ? (
            <div className="text-center py-12 text-slate-400 text-sm">
              Aucune nouveauté publiée
            </div>
          ) : (
            items.map((e) => {
              const meta = TYPE_META[e.type] || TYPE_META.FEATURE;
              return (
                <div key={e.id} className="border border-slate-200 rounded-2xl p-4">
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    <span className="font-mono text-[10px] font-black px-2 py-0.5 rounded bg-slate-900 text-white">
                      v{e.version}
                    </span>
                    <span className="text-[9px] font-black tracking-widest px-2 py-0.5 rounded-md text-white" style={{ background: meta.color }}>
                      {meta.icon} {meta.label.toUpperCase()}
                    </span>
                  </div>
                  <h3 className="font-black text-slate-900 text-sm mb-1">{e.title}</h3>
                  <p className="text-xs text-slate-600 whitespace-pre-wrap leading-relaxed">{e.body}</p>
                  <p className="text-[10px] text-slate-400 mt-3 pt-3 border-t border-slate-100">
                    {new Date(e.publishedAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })}
                  </p>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
