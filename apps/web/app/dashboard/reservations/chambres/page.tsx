'use client';

import { useState, useEffect, useMemo } from 'react';
import { apiFetch } from '../../../../lib/api';
import ConfirmDialog from '../../../../components/ConfirmDialog';
import { Modal, Button, Badge, PageHeader, FormField, Input, Select, Textarea } from '../../../../components/ui';

// ═══════════════════════════════════════════════════════════════
//  CONSTANTES
// ═══════════════════════════════════════════════════════════════

const ROOM_STATUS: Record<string, { label: string; variant: any; color: string }> = {
  AVAILABLE:    { label: 'Disponible', variant: 'success', color: '#10b981' },
  OCCUPIED:     { label: 'Occupée',    variant: 'danger',  color: '#dc2626' },
  CLEANING:     { label: 'Ménage',     variant: 'warning', color: '#f59e0b' },
  MAINTENANCE:  { label: 'Maintenance', variant: 'warning', color: '#8b5cf6' },
  OUT_OF_ORDER: { label: 'Hors service', variant: 'neutral', color: '#64748b' },
};

const VIEWS = [
  { value: 'sea',       label: 'Vue mer',       icon: '🌊' },
  { value: 'garden',    label: 'Vue jardin',    icon: '🌳' },
  { value: 'city',      label: 'Vue ville',     icon: '🏙️' },
  { value: 'pool',      label: 'Vue piscine',   icon: '🏊' },
  { value: 'mountain',  label: 'Vue montagne',  icon: '⛰️' },
  { value: 'courtyard', label: 'Vue cour',      icon: '🏡' },
];

const BED_TYPES = [
  { value: 'single',   label: 'Lit simple',       icon: '🛏️' },
  { value: 'double',   label: 'Lit double',       icon: '🛏️' },
  { value: 'twin',     label: '2 lits jumeaux',   icon: '🛏️' },
  { value: 'king',     label: 'King size',        icon: '🛏️' },
  { value: 'sofa_bed', label: 'Canapé-lit',       icon: '🛋️' },
];

const AMENITIES = [
  { key: 'wifi',        label: 'WiFi',           icon: '��' },
  { key: 'ac',          label: 'Climatisation',  icon: '❄️' },
  { key: 'tv',          label: 'TV',             icon: '📺' },
  { key: 'minibar',     label: 'Minibar',        icon: '🍷' },
  { key: 'safe',        label: 'Coffre-fort',    icon: '🔒' },
  { key: 'balcony',     label: 'Balcon',         icon: '🌅' },
  { key: 'sea_view',    label: 'Vue mer',        icon: '🌊' },
  { key: 'garden_view', label: 'Vue jardin',     icon: '🌳' },
  { key: 'bathtub',     label: 'Baignoire',      icon: '🛁' },
  { key: 'shower',      label: 'Douche',         icon: '🚿' },
  { key: 'desk',        label: 'Bureau',         icon: '💼' },
  { key: 'phone',       label: 'Téléphone',      icon: '☎️' },
];

const COLOR_PALETTE = [
  '#14b8a6', '#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b',
  '#10b981', '#06b6d4', '#ef4444', '#64748b', '#0891b2',
];

function statusMeta(s: string) { return ROOM_STATUS[s] || ROOM_STATUS.AVAILABLE; }
function bedMeta(b: string | null | undefined) {
  return BED_TYPES.find((x) => x.value === b) || null;
}

function daysUntil(date: string | Date | null) {
  if (!date) return null;
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((d.getTime() - today.getTime()) / 86400000);
}

// ═══════════════════════════════════════════════════════════════
//  PAGE PRINCIPALE
// ═══════════════════════════════════════════════════════════════

export default function ChambresPage() {
  const [tab, setTab] = useState<'rooms' | 'types'>('rooms');
  const [rooms, setRooms] = useState<any[]>([]);
  const [roomTypes, setRoomTypes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<string | null>(null);

  // Filtres chambres
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [filterType, setFilterType] = useState('ALL');
  const [filterFloor, setFilterFloor] = useState('ALL');
  const [sort, setSort] = useState<'number' | 'floor' | 'status'>('number');

  // Modals
  const [showRoomModal, setShowRoomModal] = useState(false);
  const [showTypeModal, setShowTypeModal] = useState(false);
  const [editingRoom, setEditingRoom] = useState<any>(null);
  const [editingType, setEditingType] = useState<any>(null);
  const [roomToDelete, setRoomToDelete] = useState<any>(null);
  const [typeToDelete, setTypeToDelete] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : '';
  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  async function load() {
    const [r, t] = await Promise.all([
      apiFetch('/api/hotel/rooms', { headers }).then((res) => res.json()),
      apiFetch('/api/hotel/room-types', { headers }).then((res) => res.json()),
    ]);
    setRooms(Array.isArray(r) ? r : []);
    setRoomTypes(Array.isArray(t) ? t : []);
  }

  useEffect(() => { load().catch(console.error).finally(() => setLoading(false)); }, []);

  function showToast(m: string) { setToast(m); setTimeout(() => setToast(null), 2500); }

  // ═══ Stats ═══
  const stats = useMemo(() => ({
    total: rooms.length,
    available: rooms.filter((r) => r.status === 'AVAILABLE').length,
    occupied: rooms.filter((r) => r.status === 'OCCUPIED').length,
    cleaning: rooms.filter((r) => r.status === 'CLEANING').length,
    maintenance: rooms.filter((r) => r.status === 'MAINTENANCE' || r.status === 'OUT_OF_ORDER').length,
    typesActive: roomTypes.filter((t) => t.isActive).length,
  }), [rooms, roomTypes]);

  // ═══ Filtres + tri ═══
  const floors = useMemo(() => {
    const set = new Set<number>();
    rooms.forEach((r) => { if (r.floor != null) set.add(r.floor); });
    return Array.from(set).sort((a, b) => a - b);
  }, [rooms]);

  const filtered = useMemo(() => {
    let list = [...rooms];
    if (filterStatus !== 'ALL') list = list.filter((r) => r.status === filterStatus);
    if (filterType !== 'ALL') list = list.filter((r) => r.roomTypeId === filterType);
    if (filterFloor !== 'ALL') list = list.filter((r) => String(r.floor) === filterFloor);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((r) =>
        r.number.toLowerCase().includes(q) ||
        r.roomType?.name?.toLowerCase().includes(q) ||
        (r.view || '').toLowerCase().includes(q)
      );
    }
    list.sort((a, b) => {
      if (sort === 'floor') return (a.floor || 0) - (b.floor || 0);
      if (sort === 'status') return (a.status || '').localeCompare(b.status || '');
      return String(a.number).localeCompare(String(b.number), undefined, { numeric: true });
    });
    return list;
  }, [rooms, filterStatus, filterType, filterFloor, search, sort]);

  if (loading) {
    return <div className="flex justify-center items-center h-64"><div className="animate-spin rounded-full h-10 w-10 border-4 border-teal-400 border-t-transparent"></div></div>;
  }

  return (
    <div className="space-y-5">
      {toast && <div className="fixed top-20 right-4 z-[100] bg-slate-900 text-white px-4 py-3 rounded-xl shadow-2xl text-sm font-medium">{toast}</div>}

      <PageHeader
        title="Chambres & Types"
        subtitle={`${stats.total} chambre${stats.total > 1 ? 's' : ''} · ${stats.typesActive} type${stats.typesActive > 1 ? 's' : ''} actif${stats.typesActive > 1 ? 's' : ''}`}
        actions={
          <button
            onClick={() => {
              if (tab === 'rooms') {
                if (roomTypes.length === 0) {
                  showToast('Créez d\'abord un type de chambre');
                  setTab('types');
                  setTimeout(() => openTypeModal(), 300);
                  return;
                }
                openRoomModal();
              } else {
                openTypeModal();
              }
            }}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-blue-600 to-teal-500 hover:shadow-lg text-white rounded-xl font-black text-sm transition"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" />
            </svg>
            {tab === 'rooms' ? 'Ajouter une chambre' : 'Nouveau type'}
          </button>
        }
      />

      {/* Onglets */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-1 flex gap-1 w-fit">
        <button
          onClick={() => setTab('rooms')}
          className={'px-4 py-2 rounded-xl text-sm font-bold transition ' + (tab === 'rooms' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-50')}
        >
          🛏️ Chambres ({rooms.length})
        </button>
        <button
          onClick={() => setTab('types')}
          className={'px-4 py-2 rounded-xl text-sm font-bold transition ' + (tab === 'types' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-50')}
        >
          🏷️ Types ({roomTypes.length})
        </button>
      </div>

      {/* ═══════ TAB CHAMBRES ═══════ */}
      {tab === 'rooms' && (
        <>
          {/* KPI */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="bg-white rounded-2xl p-4 border border-emerald-200">
              <p className="text-[10px] text-emerald-700 uppercase font-black tracking-widest mb-1">Disponibles</p>
              <p className="text-2xl font-black text-emerald-600">{stats.available}</p>
            </div>
            <div className="bg-white rounded-2xl p-4 border border-red-200">
              <p className="text-[10px] text-red-700 uppercase font-black tracking-widest mb-1">Occupées</p>
              <p className="text-2xl font-black text-red-600">{stats.occupied}</p>
            </div>
            <div className="bg-white rounded-2xl p-4 border border-amber-200">
              <p className="text-[10px] text-amber-700 uppercase font-black tracking-widest mb-1">En ménage</p>
              <p className="text-2xl font-black text-amber-600">{stats.cleaning}</p>
            </div>
            <div className="bg-white rounded-2xl p-4 border border-slate-200">
              <p className="text-[10px] text-slate-600 uppercase font-black tracking-widest mb-1">Maintenance</p>
              <p className="text-2xl font-black text-slate-700">{stats.maintenance}</p>
            </div>
          </div>

          {/* Guard UX : aucun type */}
          {roomTypes.length === 0 ? (
            <div className="bg-amber-50 border-2 border-amber-300 rounded-2xl p-8 text-center">
              <div className="text-4xl mb-3">🏷️</div>
              <p className="font-black text-amber-900 text-lg mb-1">Créez d'abord un type de chambre</p>
              <p className="text-sm text-amber-800 mb-4">
                Une chambre doit avoir un type (Single, Double, Suite…) qui définit sa capacité et son prix.
              </p>
              <button
                onClick={() => { setTab('types'); setTimeout(() => openTypeModal(), 200); }}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-bold text-sm transition"
              >
                + Créer un type de chambre
              </button>
            </div>
          ) : (
            <>
              {/* Filtres */}
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-3 space-y-3">
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Rechercher par numéro, type, vue…"
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:ring-2 focus:ring-teal-400"
                />
                <div className="flex flex-wrap items-center gap-1.5">
                  {[
                    { v: 'ALL', l: 'Toutes' },
                    { v: 'AVAILABLE', l: 'Disponibles' },
                    { v: 'OCCUPIED', l: 'Occupées' },
                    { v: 'CLEANING', l: 'Ménage' },
                    { v: 'MAINTENANCE', l: 'Maintenance' },
                  ].map((f) => (
                    <button key={f.v} onClick={() => setFilterStatus(f.v)}
                      className={'px-3 py-1.5 rounded-lg text-xs font-bold transition ' + (filterStatus === f.v ? 'bg-slate-900 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:border-slate-400')}>
                      {f.l}
                    </button>
                  ))}
                  <select value={filterType} onChange={(e) => setFilterType(e.target.value)}
                    className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-700 cursor-pointer">
                    <option value="ALL">Tous types</option>
                    {roomTypes.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </select>
                  {floors.length > 0 && (
                    <select value={filterFloor} onChange={(e) => setFilterFloor(e.target.value)}
                      className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-700 cursor-pointer">
                      <option value="ALL">Tous étages</option>
                      {floors.map((f) => <option key={f} value={f}>Étage {f}</option>)}
                    </select>
                  )}
                  <select value={sort} onChange={(e) => setSort(e.target.value as any)}
                    className="ml-auto px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-700 cursor-pointer">
                    <option value="number">N°</option>
                    <option value="floor">Étage</option>
                    <option value="status">Statut</option>
                  </select>
                </div>
              </div>

              {/* Liste */}
              {filtered.length === 0 ? (
                <div className="bg-white rounded-2xl border-2 border-dashed border-slate-200 p-16 text-center">
                  <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center text-3xl mx-auto mb-3">🔍</div>
                  <p className="text-slate-500 font-bold">Aucune chambre</p>
                  <p className="text-xs text-slate-400 mt-1">Modifiez les filtres ou créez une nouvelle chambre</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                  {filtered.map((r) => {
                    const sm = statusMeta(r.status);
                    const nextMaint = daysUntil(r.maintenanceDate);
                    const maintSoon = nextMaint !== null && nextMaint >= 0 && nextMaint <= 14;
                    return (
                      <button
                        key={r.id}
                        onClick={() => openRoomModal(r)}
                        className="text-left bg-white rounded-2xl border-2 border-slate-200 hover:border-teal-400 hover:shadow-lg transition overflow-hidden group"
                      >
                        {/* Photo header */}
                        <div className="relative h-28 bg-gradient-to-br from-slate-700 to-slate-900 overflow-hidden">
                          {r.photos?.[0] ? (
                            <img src={r.photos[0]} alt={r.number} className="w-full h-full object-cover group-hover:scale-105 transition" />
                          ) : (
                            <div className="flex items-center justify-center h-full">
                              <span className="text-5xl opacity-20">🛏️</span>
                            </div>
                          )}
                          <div className="absolute top-2 left-2 flex items-center gap-1.5">
                            <span className="text-sm font-black px-2.5 py-1 rounded-md bg-white/95 shadow-sm">
                              N° {r.number}
                            </span>
                            {r.floor != null && (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-900/80 text-white backdrop-blur-sm">
                                Étage {r.floor}
                              </span>
                            )}
                          </div>
                          <div className="absolute top-2 right-2">
                            <span className="text-[9px] font-black tracking-widest px-2 py-0.5 rounded-md text-white shadow-md" style={{ background: sm.color }}>
                              {sm.label.toUpperCase()}
                            </span>
                          </div>
                          <div className="absolute bottom-2 left-2 flex flex-wrap gap-1">
                            {r.hasBalcony && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-white/95">🌅 Balcon</span>}
                            {r.isAccessible && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-blue-500 text-white">♿ PMR</span>}
                          </div>
                        </div>

                        {/* Body */}
                        <div className="p-4 space-y-3">
                          <div>
                            <p className="font-black text-slate-900 text-sm">
                              {r.roomType?.name || 'Type inconnu'}
                            </p>
                            <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-0.5">
                              <span>👥 {r.roomType?.adultCapacity || 1}
                                {r.roomType?.childCapacity > 0 && ` + ${r.roomType.childCapacity} enf.`}
                              </span>
                              {r.view && (() => {
                                const v = VIEWS.find((x) => x.value === r.view);
                                return v && <span>{v.icon} {v.label}</span>;
                              })()}
                            </div>
                          </div>

                          {r.roomType?.basePrice > 0 && (
                            <div className="pt-3 border-t border-slate-100">
                              <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest">Prix / nuit</p>
                              <p className="text-lg font-black text-slate-900 tabular-nums">
                                {r.roomType.basePrice.toLocaleString('fr-FR')} <span className="text-xs">Ar</span>
                              </p>
                            </div>
                          )}

                          {maintSoon && (
                            <div className="pt-2 border-t border-slate-100">
                              <span className={`text-[10px] font-black tracking-wider px-2 py-1 rounded-md ${nextMaint === 0 ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>
                                🔧 {nextMaint === 0 ? 'Maintenance aujourd\'hui' : `Maintenance dans ${nextMaint}j`}
                              </span>
                            </div>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </>
      )}

      {/* ═══════ TAB TYPES ═══════ */}
      {tab === 'types' && (
        <>
          {roomTypes.length === 0 ? (
            <div className="bg-white rounded-2xl border-2 border-dashed border-slate-200 p-16 text-center">
              <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center text-3xl mx-auto mb-3">🏷️</div>
              <p className="text-lg font-bold text-slate-700 mb-1">Aucun type de chambre</p>
              <p className="text-sm text-slate-400 mb-4">
                Commencez par créer les catégories de vos chambres (Single, Double, Suite…)
              </p>
              <button
                onClick={openTypeModal}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-blue-600 to-teal-500 hover:shadow-lg text-white rounded-xl font-bold text-sm transition"
              >
                + Créer le premier type
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {roomTypes.map((t) => {
                const bm = bedMeta(t.bedType);
                const roomCount = t._count?.rooms || 0;
                const activeRooms = (t.rooms || []).filter((r: any) => r.status === 'OCCUPIED').length;
                const occRate = roomCount > 0 ? Math.round((activeRooms / roomCount) * 100) : 0;
                return (
                  <div key={t.id} className={'bg-white rounded-2xl border-2 overflow-hidden transition ' + (t.isActive ? 'border-slate-200 hover:border-teal-300 hover:shadow-lg' : 'border-slate-200 opacity-60')}>
                    {/* Header coloré */}
                    <div className="relative h-32 overflow-hidden" style={{ background: t.photos?.[0] ? undefined : t.color }}>
                      {t.photos?.[0] ? (
                        <img src={t.photos[0]} alt={t.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="flex items-center justify-center h-full">
                          <span className="text-6xl opacity-30 text-white">{bm?.icon || '🏨'}</span>
                        </div>
                      )}
                      <div className="absolute top-2 right-2 flex gap-1">
                        {!t.isActive && (
                          <span className="text-[9px] font-black tracking-widest px-2 py-0.5 rounded-md bg-slate-900/80 text-white backdrop-blur-sm">
                            INACTIF
                          </span>
                        )}
                        <span className="text-[9px] font-black tracking-widest px-2 py-0.5 rounded-md text-white backdrop-blur-sm" style={{ background: t.color + 'cc' }}>
                          {roomCount} CH.
                        </span>
                      </div>
                    </div>

                    {/* Body */}
                    <div className="p-5 space-y-3">
                      <div>
                        <h3 className="font-black text-slate-900 text-lg leading-tight">{t.name}</h3>
                        {t.description && <p className="text-xs text-slate-500 mt-1 line-clamp-2">{t.description}</p>}
                      </div>

                      {/* Badges clés */}
                      <div className="flex flex-wrap gap-1.5">
                        <span className="text-[10px] font-bold px-2 py-1 rounded-lg bg-blue-50 text-blue-700">
                          👥 {t.adultCapacity} adulte{t.adultCapacity > 1 ? 's' : ''}
                          {t.childCapacity > 0 && ` + ${t.childCapacity} enf.`}
                        </span>
                        {bm && (
                          <span className="text-[10px] font-bold px-2 py-1 rounded-lg bg-slate-100 text-slate-700">
                            {bm.icon} {t.bedCount > 1 ? `${t.bedCount}× ` : ''}{bm.label}
                          </span>
                        )}
                        {t.surface && (
                          <span className="text-[10px] font-bold px-2 py-1 rounded-lg bg-slate-100 text-slate-700">
                            📐 {t.surface} m²
                          </span>
                        )}
                      </div>

                      {/* Amenities */}
                      {t.amenities?.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {t.amenities.slice(0, 6).map((a: string) => {
                            const am = AMENITIES.find((x) => x.key === a);
                            return am ? (
                              <span key={a} title={am.label} className="text-sm">{am.icon}</span>
                            ) : null;
                          })}
                          {t.amenities.length > 6 && (
                            <span className="text-[10px] font-bold text-slate-400 self-center">+{t.amenities.length - 6}</span>
                          )}
                        </div>
                      )}

                      {/* Prix */}
                      <div className="bg-slate-50 rounded-xl p-3 space-y-1.5">
                        <div className="flex justify-between items-baseline">
                          <span className="text-[10px] text-slate-500 uppercase font-black tracking-widest">Semaine</span>
                          <span className="text-lg font-black text-slate-900 tabular-nums">
                            {t.basePrice.toLocaleString('fr-FR')} <span className="text-xs">Ar</span>
                          </span>
                        </div>
                        {t.weekendPrice != null && t.weekendPrice !== t.basePrice && (
                          <div className="flex justify-between items-baseline pt-1.5 border-t border-slate-200">
                            <span className="text-[10px] text-amber-700 uppercase font-black tracking-widest">Week-end</span>
                            <span className="text-sm font-black text-amber-700 tabular-nums">
                              {t.weekendPrice.toLocaleString('fr-FR')} <span className="text-[10px]">Ar</span>
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Taux occupation */}
                      {roomCount > 0 && (
                        <div>
                          <div className="flex justify-between text-[10px] font-bold mb-1">
                            <span className="text-slate-500 uppercase tracking-widest">Occupation</span>
                            <span className="text-slate-900">{occRate}%</span>
                          </div>
                          <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                            <div className="h-full rounded-full transition" style={{ width: occRate + '%', background: t.color }}></div>
                          </div>
                        </div>
                      )}

                      {/* Actions */}
                      <div className="flex gap-1.5 pt-3 border-t border-slate-100">
                        <button onClick={() => openTypeModal(t)}
                          className="flex-1 py-2 rounded-lg bg-slate-100 hover:bg-blue-100 text-slate-700 hover:text-blue-700 text-xs font-bold transition">
                          ✏️ Modifier
                        </button>
                        <button onClick={() => setTypeToDelete(t)}
                          className="px-3 py-2 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 text-xs font-bold transition">
                          🗑️
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* Modals */}
      <RoomModal
        open={showRoomModal}
        onClose={() => { setShowRoomModal(false); setEditingRoom(null); }}
        editing={editingRoom}
        roomTypes={roomTypes}
        headers={headers}
        onSaved={async () => { setShowRoomModal(false); setEditingRoom(null); showToast('Chambre enregistrée'); await load(); }}
      />

      <RoomTypeModal
        open={showTypeModal}
        onClose={() => { setShowTypeModal(false); setEditingType(null); }}
        editing={editingType}
        headers={headers}
        onSaved={async () => { setShowTypeModal(false); setEditingType(null); showToast('Type enregistré'); await load(); }}
      />

      <ConfirmDialog
        open={!!roomToDelete}
        title="Supprimer la chambre"
        message={`Supprimer la chambre ${roomToDelete?.number} ?`}
        onClose={() => setRoomToDelete(null)}
        onConfirm={async () => {
          await apiFetch(`/api/hotel/rooms/${roomToDelete.id}`, { method: 'DELETE', headers });
          setRoomToDelete(null); showToast('Chambre supprimée'); await load();
        }}
      />

      <ConfirmDialog
        open={!!typeToDelete}
        title="Supprimer le type"
        message={`Supprimer le type "${typeToDelete?.name}" ? ${typeToDelete?._count?.rooms > 0 ? '⚠️ Des chambres l\'utilisent.' : ''}`}
        onClose={() => setTypeToDelete(null)}
        onConfirm={async () => {
          const res = await apiFetch(`/api/hotel/room-types/${typeToDelete.id}`, { method: 'DELETE', headers });
          if (res.ok) { setTypeToDelete(null); showToast('Type supprimé'); await load(); }
          else { const d = await res.json(); showToast(d.message); setTypeToDelete(null); }
        }}
      />
    </div>
  );

  function openRoomModal(room?: any) {
    setEditingRoom(room || null);
    setShowRoomModal(true);
  }

  function openTypeModal(t?: any) {
    setEditingType(t || null);
    setShowTypeModal(true);
  }
}

// ═══════════════════════════════════════════════════════════════
//  MODAL — TYPE DE CHAMBRE (riche)
// ═══════════════════════════════════════════════════════════════

function RoomTypeModal({ open, onClose, editing, headers, onSaved }: any) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [adultCapacity, setAdultCapacity] = useState('1');
  const [childCapacity, setChildCapacity] = useState('0');
  const [basePrice, setBasePrice] = useState('');
  const [weekendPrice, setWeekendPrice] = useState('');
  const [surface, setSurface] = useState('');
  const [bedType, setBedType] = useState('double');
  const [bedCount, setBedCount] = useState('1');
  const [amenities, setAmenities] = useState<string[]>([]);
  const [photos, setPhotos] = useState<string[]>(['']);
  const [color, setColor] = useState('#14b8a6');
  const [sortOrder, setSortOrder] = useState('0');
  const [isActive, setIsActive] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      if (editing) {
        setName(editing.name || '');
        setDescription(editing.description || '');
        setAdultCapacity(String(editing.adultCapacity || 1));
        setChildCapacity(String(editing.childCapacity || 0));
        setBasePrice(String(editing.basePrice || ''));
        setWeekendPrice(editing.weekendPrice != null ? String(editing.weekendPrice) : '');
        setSurface(editing.surface != null ? String(editing.surface) : '');
        setBedType(editing.bedType || 'double');
        setBedCount(String(editing.bedCount || 1));
        setAmenities(editing.amenities || []);
        setPhotos(editing.photos?.length > 0 ? editing.photos : ['']);
        setColor(editing.color || '#14b8a6');
        setSortOrder(String(editing.sortOrder || 0));
        setIsActive(editing.isActive !== false);
      } else {
        setName(''); setDescription('');
        setAdultCapacity('1'); setChildCapacity('0');
        setBasePrice(''); setWeekendPrice(''); setSurface('');
        setBedType('double'); setBedCount('1');
        setAmenities([]); setPhotos(['']);
        setColor('#14b8a6'); setSortOrder('0'); setIsActive(true);
      }
      setError(null);
    }
  }, [open, editing]);

  function toggleAmenity(key: string) {
    setAmenities((prev) => prev.includes(key) ? prev.filter((x) => x !== key) : [...prev, key]);
  }

  function updatePhoto(idx: number, value: string) {
    setPhotos((prev) => prev.map((p, i) => i === idx ? value : p));
  }
  function addPhoto() { setPhotos((prev) => [...prev, '']); }
  function removePhoto(idx: number) {
    setPhotos((prev) => prev.length > 1 ? prev.filter((_, i) => i !== idx) : ['']);
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setError(null); setSaving(true);
    const method = editing ? 'PATCH' : 'POST';
    const url = editing ? `/api/hotel/room-types/${editing.id}` : '/api/hotel/room-types';
    const res = await apiFetch(url, {
      method, headers,
      body: JSON.stringify({
        name, description,
        adultCapacity, childCapacity,
        basePrice, weekendPrice: weekendPrice || null,
        surface: surface || null,
        bedType, bedCount,
        amenities, photos: photos.filter((p) => p.trim()),
        color, sortOrder, isActive,
      }),
    });
    setSaving(false);
    if (res.ok) onSaved();
    else { const d = await res.json(); setError(d.message || 'Erreur'); }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editing ? 'Modifier le type' : 'Nouveau type de chambre'}
      subtitle={editing ? editing.name : 'Définissez une catégorie de chambre'}
      icon={<span className="text-2xl">🏷️</span>}
      size="lg"
      footer={
        <div className="flex gap-3">
          <Button variant="secondary" onClick={onClose}>Annuler</Button>
          <button type="submit" form="type-form" disabled={saving}
            className="flex-1 bg-linear-to-r from-blue-600 to-teal-500 text-white py-2.5 rounded-xl font-semibold hover:shadow-lg transition disabled:opacity-50">
            {saving ? 'Enregistrement...' : editing ? 'Enregistrer' : 'Créer le type'}
          </button>
        </div>
      }
    >
      <form id="type-form" onSubmit={save} className="space-y-5">
        {error && <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">{error}</div>}

        {/* Section : Infos de base */}
        <SectionHeader icon="📋" title="Informations de base" />
        <div className="grid grid-cols-2 gap-3">
          <FormField label="Nom" required>
            <Input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Suite Deluxe" required />
          </FormField>
          <FormField label="Ordre d'affichage" hint="Plus petit = affiché en premier">
            <Input type="number" value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} />
          </FormField>
        </div>
        <FormField label="Description">
          <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} placeholder="Chambre spacieuse avec balcon…" />
        </FormField>

        {/* Section : Capacité */}
        <SectionHeader icon="👥" title="Capacité" />
        <div className="grid grid-cols-2 gap-3">
          <FormField label="Adultes" required>
            <Input type="number" min="1" value={adultCapacity} onChange={(e) => setAdultCapacity(e.target.value)} required />
          </FormField>
          <FormField label="Enfants">
            <Input type="number" min="0" value={childCapacity} onChange={(e) => setChildCapacity(e.target.value)} />
          </FormField>
        </div>

        {/* Section : Détails physiques */}
        <SectionHeader icon="🛏️" title="Détails physiques" />
        <div className="grid grid-cols-3 gap-3">
          <FormField label="Type de lit">
            <select value={bedType} onChange={(e) => setBedType(e.target.value)}
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900">
              {BED_TYPES.map((b) => <option key={b.value} value={b.value}>{b.icon} {b.label}</option>)}
            </select>
          </FormField>
          <FormField label="Nombre de lits">
            <Input type="number" min="1" value={bedCount} onChange={(e) => setBedCount(e.target.value)} />
          </FormField>
          <FormField label="Surface (m²)">
            <Input type="number" step="0.5" value={surface} onChange={(e) => setSurface(e.target.value)} placeholder="25" />
          </FormField>
        </div>

        {/* Section : Prix */}
        <SectionHeader icon="💰" title="Tarification" />
        <div className="grid grid-cols-2 gap-3">
          <FormField label="Prix semaine (Ar)" required>
            <Input type="number" step="1000" value={basePrice} onChange={(e) => setBasePrice(e.target.value)} placeholder="50000" required />
          </FormField>
          <FormField label="Prix week-end (Ar)" hint="Optionnel">
            <Input type="number" step="1000" value={weekendPrice} onChange={(e) => setWeekendPrice(e.target.value)} placeholder="60000" />
          </FormField>
        </div>

        {/* Section : Équipements */}
        <SectionHeader icon="✨" title="Équipements" />
        <div className="grid grid-cols-3 gap-2">
          {AMENITIES.map((a) => {
            const checked = amenities.includes(a.key);
            return (
              <button key={a.key} type="button" onClick={() => toggleAmenity(a.key)}
                className={'flex items-center gap-2 p-2.5 rounded-xl border-2 text-left transition ' + (checked ? 'border-teal-400 bg-teal-50' : 'border-slate-200 hover:border-slate-400')}>
                <span className="text-lg">{a.icon}</span>
                <span className={'text-xs font-bold ' + (checked ? 'text-teal-900' : 'text-slate-700')}>{a.label}</span>
              </button>
            );
          })}
        </div>

        {/* Section : Photos */}
        <SectionHeader icon="🖼️" title="Photos (URLs)" />
        <div className="space-y-2">
          {photos.map((p, idx) => (
            <div key={idx} className="flex gap-2">
              <input type="url" value={p} onChange={(e) => updatePhoto(idx, e.target.value)}
                placeholder="https://exemple.com/photo.jpg"
                className="flex-1 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono text-slate-900 focus:ring-2 focus:ring-teal-400" />
              <button type="button" onClick={() => removePhoto(idx)}
                className="w-10 h-10 rounded-xl bg-red-50 hover:bg-red-100 text-red-500 flex items-center justify-center transition">
                ✕
              </button>
            </div>
          ))}
          <button type="button" onClick={addPhoto} className="text-xs font-bold text-teal-600 hover:underline">
            + Ajouter une photo
          </button>
        </div>

        {/* Section : Couleur & activation */}
        <SectionHeader icon="🎨" title="Apparence & statut" />
        <FormField label="Couleur (planning)">
          <div className="flex flex-wrap gap-2">
            {COLOR_PALETTE.map((c) => (
              <button key={c} type="button" onClick={() => setColor(c)}
                className={'w-9 h-9 rounded-lg transition ' + (color === c ? 'ring-4 ring-offset-2 ring-slate-900 scale-110' : 'hover:scale-110')}
                style={{ background: c }} />
            ))}
            <input type="color" value={color} onChange={(e) => setColor(e.target.value)}
              className="w-9 h-9 rounded-lg cursor-pointer" />
          </div>
        </FormField>
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} className="w-4 h-4 rounded text-teal-600" />
          <span className="text-sm font-medium text-slate-700">Type actif (visible pour la création de chambres)</span>
        </label>
      </form>
    </Modal>
  );
}

// ═══════════════════════════════════════════════════════════════
//  MODAL — CHAMBRE
// ═══════════════════════════════════════════════════════════════

function RoomModal({ open, onClose, editing, roomTypes, headers, onSaved }: any) {
  const [number, setNumber] = useState('');
  const [floor, setFloor] = useState('');
  const [status, setStatus] = useState('AVAILABLE');
  const [view, setView] = useState('');
  const [isAccessible, setIsAccessible] = useState(false);
  const [hasBalcony, setHasBalcony] = useState(false);
  const [notes, setNotes] = useState('');
  const [internalNotes, setInternalNotes] = useState('');
  const [maintenanceDate, setMaintenanceDate] = useState('');
  const [photos, setPhotos] = useState<string[]>(['']);
  const [roomTypeId, setRoomTypeId] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const activeTypes = roomTypes.filter((t: any) => t.isActive);

  useEffect(() => {
    if (open) {
      if (editing) {
        setNumber(editing.number || '');
        setFloor(editing.floor != null ? String(editing.floor) : '');
        setStatus(editing.status || 'AVAILABLE');
        setView(editing.view || '');
        setIsAccessible(!!editing.isAccessible);
        setHasBalcony(!!editing.hasBalcony);
        setNotes(editing.notes || '');
        setInternalNotes(editing.internalNotes || '');
        setMaintenanceDate(editing.maintenanceDate ? editing.maintenanceDate.slice(0, 10) : '');
        setPhotos(editing.photos?.length > 0 ? editing.photos : ['']);
        setRoomTypeId(editing.roomTypeId || '');
      } else {
        setNumber(''); setFloor(''); setStatus('AVAILABLE');
        setView(''); setIsAccessible(false); setHasBalcony(false);
        setNotes(''); setInternalNotes(''); setMaintenanceDate('');
        setPhotos(['']);
        setRoomTypeId(activeTypes[0]?.id || '');
      }
      setError(null);
    }
  }, [open, editing]);

  function updatePhoto(idx: number, value: string) {
    setPhotos((prev) => prev.map((p, i) => i === idx ? value : p));
  }
  function addPhoto() { setPhotos((prev) => [...prev, '']); }
  function removePhoto(idx: number) {
    setPhotos((prev) => prev.length > 1 ? prev.filter((_, i) => i !== idx) : ['']);
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setError(null); setSaving(true);
    const method = editing ? 'PATCH' : 'POST';
    const url = editing ? `/api/hotel/rooms/${editing.id}` : '/api/hotel/rooms';
    const res = await apiFetch(url, {
      method, headers,
      body: JSON.stringify({
        number, floor: floor || null, status, view: view || null,
        isAccessible, hasBalcony, notes, internalNotes,
        maintenanceDate: maintenanceDate || null,
        photos: photos.filter((p) => p.trim()),
        roomTypeId,
      }),
    });
    setSaving(false);
    if (res.ok) onSaved();
    else { const d = await res.json(); setError(d.message || 'Erreur'); }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editing ? `Modifier chambre ${editing.number}` : 'Ajouter une chambre'}
      subtitle={editing ? editing.roomType?.name : 'Créez une nouvelle chambre'}
      icon={<span className="text-2xl">🛏️</span>}
      size="lg"
      footer={
        <div className="flex gap-3">
          <Button variant="secondary" onClick={onClose}>Annuler</Button>
          <button type="submit" form="room-form" disabled={saving}
            className="flex-1 bg-linear-to-r from-blue-600 to-teal-500 text-white py-2.5 rounded-xl font-semibold hover:shadow-lg transition disabled:opacity-50">
            {saving ? 'Enregistrement...' : editing ? 'Enregistrer' : 'Créer la chambre'}
          </button>
        </div>
      }
    >
      <form id="room-form" onSubmit={save} className="space-y-5">
        {error && <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">{error}</div>}

        <SectionHeader icon="🔢" title="Identification" />
        <div className="grid grid-cols-3 gap-3">
          <FormField label="Numéro" required>
            <Input type="text" value={number} onChange={(e) => setNumber(e.target.value)} placeholder="101" required />
          </FormField>
          <FormField label="Étage">
            <Input type="number" value={floor} onChange={(e) => setFloor(e.target.value)} placeholder="1" />
          </FormField>
          <FormField label="Statut">
            <select value={status} onChange={(e) => setStatus(e.target.value)}
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900">
              {Object.entries(ROOM_STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
          </FormField>
        </div>

        <FormField label="Type de chambre" required>
          {activeTypes.length === 0 ? (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-800">
              Aucun type actif. Créez d'abord un type.
            </div>
          ) : (
            <select value={roomTypeId} onChange={(e) => setRoomTypeId(e.target.value)} required
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900">
              <option value="">— Choisir —</option>
              {activeTypes.map((t: any) => (
                <option key={t.id} value={t.id}>
                  {t.name} — {t.adultCapacity + t.childCapacity} pers. — {t.basePrice.toLocaleString('fr-FR')} Ar
                </option>
              ))}
            </select>
          )}
        </FormField>

        <SectionHeader icon="🏞️" title="Caractéristiques" />
        <FormField label="Vue">
          <select value={view} onChange={(e) => setView(e.target.value)}
            className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900">
            <option value="">— Aucune spécification —</option>
            {VIEWS.map((v) => <option key={v.value} value={v.value}>{v.icon} {v.label}</option>)}
          </select>
        </FormField>
        <div className="grid grid-cols-2 gap-3">
          <label className={'flex items-center gap-2 p-3 rounded-xl border-2 cursor-pointer transition ' + (hasBalcony ? 'border-teal-400 bg-teal-50' : 'border-slate-200')}>
            <input type="checkbox" checked={hasBalcony} onChange={(e) => setHasBalcony(e.target.checked)} className="w-4 h-4 rounded text-teal-600" />
            <span className="text-sm font-bold text-slate-700">🌅 Balcon</span>
          </label>
          <label className={'flex items-center gap-2 p-3 rounded-xl border-2 cursor-pointer transition ' + (isAccessible ? 'border-blue-400 bg-blue-50' : 'border-slate-200')}>
            <input type="checkbox" checked={isAccessible} onChange={(e) => setIsAccessible(e.target.checked)} className="w-4 h-4 rounded text-blue-600" />
            <span className="text-sm font-bold text-slate-700">♿ Accessible PMR</span>
          </label>
        </div>

        <SectionHeader icon="📅" title="Maintenance" />
        <FormField label="Prochaine date de maintenance" hint="Rappel visuel 14 jours avant">
          <Input type="date" value={maintenanceDate} onChange={(e) => setMaintenanceDate(e.target.value)} />
        </FormField>

        <SectionHeader icon="🖼️" title="Photos" />
        <div className="space-y-2">
          {photos.map((p, idx) => (
            <div key={idx} className="flex gap-2">
              <input type="url" value={p} onChange={(e) => updatePhoto(idx, e.target.value)}
                placeholder="https://exemple.com/chambre-101.jpg"
                className="flex-1 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono text-slate-900 focus:ring-2 focus:ring-teal-400" />
              <button type="button" onClick={() => removePhoto(idx)}
                className="w-10 h-10 rounded-xl bg-red-50 hover:bg-red-100 text-red-500 flex items-center justify-center transition">
                ✕
              </button>
            </div>
          ))}
          <button type="button" onClick={addPhoto} className="text-xs font-bold text-teal-600 hover:underline">
            + Ajouter une photo
          </button>
        </div>

        <SectionHeader icon="📝" title="Notes" />
        <FormField label="Notes (visibles équipe)">
          <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} placeholder="Chambre côté rue, peut être bruyante…" />
        </FormField>
        <FormField label="Notes internes (privées)">
          <Textarea value={internalNotes} onChange={(e) => setInternalNotes(e.target.value)} rows={2} placeholder="Code cadenas = 1234, robinet capricieux…" />
        </FormField>
      </form>
    </Modal>
  );
}

// ═══════════════════════════════════════════════════════════════
//  SOUS-COMPOSANTS
// ═══════════════════════════════════════════════════════════════

function SectionHeader({ icon, title }: { icon: string; title: string }) {
  return (
    <div className="flex items-center gap-2 pt-2 pb-1 border-b border-slate-100">
      <span className="text-base">{icon}</span>
      <h3 className="text-[11px] font-black text-slate-500 uppercase tracking-widest">{title}</h3>
    </div>
  );
}
