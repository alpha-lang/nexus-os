'use client';

import { useState, useEffect, useMemo } from 'react';
import { Badge } from '../../../../components/ui';
import KanbanBoard, { KanbanColumn, KanbanItem } from '../../../../components/kanban/KanbanBoard';

const COLUMNS: KanbanColumn[] = [
  { id: 'PENDING', title: 'En attente', color: 'bg-amber-500' },
  { id: 'CONFIRMED', title: 'Confirmees', color: 'bg-blue-500' },
  { id: 'CHECKED_IN', title: 'En sejour', color: 'bg-emerald-500' },
  { id: 'CHECKED_OUT', title: 'Terminees', color: 'bg-slate-400' },
  { id: 'CANCELLED', title: 'Annulees', color: 'bg-red-500' },
];

const STATUS_VARIANTS: Record<string, any> = {
  PENDING: 'warning',
  CONFIRMED: 'info',
  CHECKED_IN: 'success',
  CHECKED_OUT: 'neutral',
  CANCELLED: 'danger',
  NO_SHOW: 'warning',
};

const STATUS_LABELS: Record<string, string> = {
  PENDING: 'En attente',
  CONFIRMED: 'Confirmee',
  CHECKED_IN: 'Check-in',
  CHECKED_OUT: 'Terminee',
  CANCELLED: 'Annulee',
  NO_SHOW: 'No-show',
};

const PRESETS = [
  { id: 'today', label: "Aujourd'hui", days: 0 },
  { id: 'week', label: 'Cette semaine', days: 7 },
  { id: 'month', label: '30 jours', days: 30 },
  { id: 'all', label: 'Tout l historique', days: null },
] as const;

type PresetId = typeof PRESETS[number]['id'];

const PER_COLUMN_INITIAL = 15;
const PER_COLUMN_STEP = 15;

function defaultVisibleCounts(): Record<string, number> {
  const counts: Record<string, number> = {};
  COLUMNS.forEach((c) => { counts[c.id] = PER_COLUMN_INITIAL; });
  return counts;
}

export default function ReservationsKanbanPage() {
  const [items, setItems] = useState<KanbanItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [preset, setPreset] = useState<PresetId>('week');
  const [visibleCounts, setVisibleCounts] = useState<Record<string, number>>(defaultVisibleCounts());

  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : '';

  async function load() {
    const res = await fetch('/api/hotel/reservations', {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    if (Array.isArray(data)) {
      setItems(data.map((r: any) => ({ id: r.id, columnId: r.status, data: r })));
    }
  }

  useEffect(() => {
    load().catch(console.error).finally(() => setLoading(false));
  }, []);

  // Reset des limites quand filtres changent
  useEffect(() => {
    setVisibleCounts(defaultVisibleCounts());
  }, [preset, search]);

  // Filtrage (date + recherche)
  const filteredItems = useMemo(() => {
    let list = items;

    if (preset !== 'all') {
      const conf = PRESETS.find((p) => p.id === preset);
      const days = conf?.days ?? 30;
      const now = Date.now();
      const spanMs = preset === 'today' ? 86400000 : days * 86400000;
      const fromMs = now - spanMs;
      const toMs = now + spanMs;

      list = list.filter((item) => {
        const ci = new Date(item.data.checkInDate).getTime();
        const co = new Date(item.data.checkOutDate).getTime();
        return co >= fromMs && ci <= toMs;
      });
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((item) => {
        const r = item.data;
        const name = `${r.customer?.firstName || ''} ${r.customer?.lastName || ''}`.toLowerCase();
        const ref = (r.reference || '').toLowerCase();
        const room = (r.room?.number || '').toLowerCase();
        return name.includes(q) || ref.includes(q) || room.includes(q);
      });
    }

    return list;
  }, [items, preset, search]);

  // Vrais totaux par colonne (avant slice)
  const trueCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    COLUMNS.forEach((c) => { counts[c.id] = 0; });
    filteredItems.forEach((i) => {
      counts[i.columnId] = (counts[i.columnId] || 0) + 1;
    });
    return counts;
  }, [filteredItems]);

  // Items visibles (slice par colonne)
  const visibleItems = useMemo(() => {
    const byCol: Record<string, KanbanItem[]> = {};
    filteredItems.forEach((i) => {
      if (!byCol[i.columnId]) byCol[i.columnId] = [];
      byCol[i.columnId].push(i);
    });

    const visible: KanbanItem[] = [];
    Object.entries(byCol).forEach(([colId, list]) => {
      const limit = visibleCounts[colId] ?? PER_COLUMN_INITIAL;
      visible.push(...list.slice(0, limit));
    });
    return visible;
  }, [filteredItems, visibleCounts]);

  async function handleMove(itemId: string, newColumnId: string) {
    setItems((prev) => prev.map((i) => (i.id === itemId ? { ...i, columnId: newColumnId } : i)));

    const item = items.find((i) => i.id === itemId);
    if (!item) return;

    if (newColumnId === 'CHECKED_IN' && item.columnId !== 'CHECKED_IN') {
      await fetch(`/api/hotel/reservations/${itemId}/check-in`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` },
      });
    } else if (newColumnId === 'CHECKED_OUT' && item.columnId !== 'CHECKED_OUT') {
      await fetch(`/api/hotel/reservations/${itemId}/check-out`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` },
      });
    } else {
      await fetch(`/api/hotel/reservations/${itemId}`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newColumnId }),
      });
    }

    await load();
  }

  function loadMore(columnId: string) {
    setVisibleCounts((prev) => ({
      ...prev,
      [columnId]: (prev[columnId] ?? PER_COLUMN_INITIAL) + PER_COLUMN_STEP,
    }));
  }

  function renderItem(item: KanbanItem) {
    const r = item.data;
    return (
      <div className="bg-white rounded-xl p-3 shadow-sm border border-gray-200 hover:border-teal-300 hover:shadow-md transition">
        <div className="flex items-start justify-between gap-2 mb-2">
          <span className="font-mono text-xs font-bold text-slate-700">{r.reference}</span>
          <Badge variant={STATUS_VARIANTS[r.status]}>
            {STATUS_LABELS[r.status] || r.status}
          </Badge>
        </div>

        <div className="flex items-center gap-2 mb-2">
          <div className="w-7 h-7 bg-gradient-to-br from-blue-500 to-teal-500 rounded-full flex items-center justify-center text-white font-bold text-xs shrink-0">
            {r.customer?.firstName?.charAt(0)}
            {r.customer?.lastName?.charAt(0)}
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-sm font-medium text-slate-900 truncate">
              {r.customer?.firstName} {r.customer?.lastName}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between text-xs mb-2">
          <span className="text-slate-500">Ch. {r.room?.number}</span>
          <span className="font-semibold text-slate-900">
            {r.totalAmount?.toLocaleString('fr-FR')} Ar
          </span>
        </div>

        <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
          <span>{new Date(r.checkInDate).toLocaleDateString('fr-FR')}</span>
          <span>→</span>
          <span>{new Date(r.checkOutDate).toLocaleDateString('fr-FR')}</span>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-10 w-10 border-4 border-teal-400 border-t-transparent"></div>
      </div>
    );
  }

  const totalFiltered = filteredItems.length;
  const activePreset = PRESETS.find((p) => p.id === preset);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Reservations — Vue Kanban</h1>
          <p className="text-slate-500 mt-1 text-sm">
            {totalFiltered} carte{totalFiltered > 1 ? 's' : ''} affichee{totalFiltered > 1 ? 's' : ''}
            {activePreset && preset !== 'all' && ` · ${activePreset.label.toLowerCase()}`}
          </p>
        </div>

        <a
          href="/dashboard/reservations"
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-white border-2 border-slate-300 rounded-xl text-sm font-semibold text-slate-700 hover:bg-slate-900 hover:text-white hover:border-slate-900 transition shadow-sm whitespace-nowrap self-start sm:self-auto"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Vue tableau
        </a>
      </div>

      {/* Filtres */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-3 space-y-3">
        <div className="relative">
          <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
            </svg>
          </span>
          <input
            type="text"
            placeholder="Rechercher par nom, reference, chambre..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:ring-2 focus:ring-teal-400 focus:border-teal-400 focus:bg-white transition"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-700"
            >
              ✕
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {PRESETS.map((p) => (
            <button
              key={p.id}
              onClick={() => setPreset(p.id)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition ${
                preset === p.id
                  ? 'bg-slate-900 text-white shadow-md'
                  : 'bg-white border border-slate-200 text-slate-600 hover:border-slate-400'
              }`}
            >
              {p.label}
            </button>
          ))}
          {(search || preset !== 'week') && (
            <button
              onClick={() => { setSearch(''); setPreset('week'); }}
              className="ml-auto text-xs text-teal-600 hover:underline font-bold"
            >
              Reinitialiser
            </button>
          )}
        </div>
      </div>

      <KanbanBoard
        columns={COLUMNS}
        items={visibleItems}
        onMove={handleMove}
        renderItem={renderItem}
        trueCounts={trueCounts}
        onLoadMore={loadMore}
      />
    </div>
  );
}
