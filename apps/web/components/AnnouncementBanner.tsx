'use client';

import { useEffect, useState } from 'react';
import { apiFetch } from '../lib/api';

const TYPE_META: Record<string, { bg: string; border: string; text: string; icon: string }> = {
  INFO:    { bg: 'bg-blue-50',    border: 'border-blue-500',    text: 'text-blue-900',    icon: 'ℹ️' },
  SUCCESS: { bg: 'bg-emerald-50', border: 'border-emerald-500', text: 'text-emerald-900', icon: '✅' },
  WARNING: { bg: 'bg-amber-50',   border: 'border-amber-500',   text: 'text-amber-900',   icon: '⚠️' },
  DANGER:  { bg: 'bg-red-50',     border: 'border-red-500',     text: 'text-red-900',     icon: '🚨' },
};

const DISMISS_KEY = 'nexus_announcements_dismissed';

function getDismissed(): string[] {
  if (typeof window === 'undefined') return [];
  try { return JSON.parse(localStorage.getItem(DISMISS_KEY) || '[]'); }
  catch { return []; }
}

export default function AnnouncementBanner() {
  const [items, setItems] = useState<any[]>([]);
  const [dismissed, setDismissed] = useState<string[]>([]);

  useEffect(() => {
    setDismissed(getDismissed());
    apiFetch('/api/announcements/active')
      .then((r) => (r.ok ? r.json() : []))
      .then((d) => setItems(Array.isArray(d) ? d : []))
      .catch(() => {});
  }, []);

  function dismiss(id: string) {
    const next = [...dismissed, id];
    setDismissed(next);
    localStorage.setItem(DISMISS_KEY, JSON.stringify(next));
  }

  const visible = items.filter((a) => !dismissed.includes(a.id));
  if (visible.length === 0) return null;

  return (
    <div className="space-y-2">
      {visible.map((a) => {
        const meta = TYPE_META[a.type] || TYPE_META.INFO;
        return (
          <div
            key={a.id}
            className={`no-print rounded-xl border-l-4 ${meta.border} ${meta.bg} px-4 py-3 flex items-start gap-3 shadow-sm`}
          >
            <span className="text-lg shrink-0">{meta.icon}</span>
            <div className="flex-1 min-w-0">
              <p className={`font-black text-sm ${meta.text}`}>{a.title}</p>
              <p className={`text-xs mt-0.5 ${meta.text} opacity-90 whitespace-pre-wrap`}>{a.message}</p>
            </div>
            {a.isDismissible && (
              <button
                onClick={() => dismiss(a.id)}
                className={`shrink-0 w-6 h-6 rounded-md hover:bg-black/10 flex items-center justify-center ${meta.text} transition`}
                title="Fermer"
              >
                ✕
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}
