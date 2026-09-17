'use client';

import { useState, useEffect } from 'react';
import { apiFetch } from '../../../../lib/api';
import ConfirmDialog from '../../../../components/ConfirmDialog';
import { Modal, Button, FormField, Input, Select } from '../../../../components/ui';

interface Table {
  id: string;
  number: string;
  location: string;
  capacity: number;
  status: string;
}

const LOCATIONS = [
  { id: 'RESTAURANT', label: 'Restaurant', gradient: 'from-orange-500 to-amber-500' },
  { id: 'TERRACE',    label: 'Terrasse',   gradient: 'from-green-500 to-emerald-500' },
  { id: 'POOL',       label: 'Piscine',    gradient: 'from-cyan-500 to-blue-500' },
  { id: 'BAR',        label: 'Bar',        gradient: 'from-purple-500 to-pink-500' },
  { id: 'LOBBY',      label: 'Lobby',      gradient: 'from-slate-500 to-slate-700' },
];

const ZONE_SHORT: Record<string, { code: string; bg: string }> = {
  RESTAURANT: { code: 'REST', bg: 'bg-orange-600' },
  TERRACE:    { code: 'TERR', bg: 'bg-green-600' },
  POOL:       { code: 'POOL', bg: 'bg-cyan-600' },
  BAR:        { code: 'BAR',  bg: 'bg-purple-600' },
  LOBBY:      { code: 'LOBBY', bg: 'bg-slate-600' },
};

const STATUS_OPTIONS = [
  { value: 'FREE', label: 'Libre' },
  { value: 'OCCUPIED', label: 'Occupee' },
  { value: 'RESERVED', label: 'Reservee' },
  { value: 'CLEANING', label: 'A nettoyer' },
];

export default function TablesMapPage() {
  const [tables, setTables] = useState<Table[]>([]);
  const [loading, setLoading] = useState(true);
  const [locationFilter, setLocationFilter] = useState('ALL');
  const [search, setSearch] = useState('');
  const [view, setView] = useState<'confort' | 'compact'>('confort');
  const [showTableModal, setShowTableModal] = useState(false);
  const [editingTable, setEditingTable] = useState<Table | null>(null);
  const [tableToDelete, setTableToDelete] = useState<Table | null>(null);
  const [tNumber, setTNumber] = useState('');
  const [tLocation, setTLocation] = useState('RESTAURANT');
  const [tCapacity, setTCapacity] = useState('2');
  const [tStatus, setTStatus] = useState('FREE');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : '';

  useEffect(() => {
    let cancelled = false;
    async function loadData() {
      try {
        const res = await apiFetch('/api/pos/tables', {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (!cancelled) setTables(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error(err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    loadData();
    return () => {
      cancelled = true;
    };
  }, [token]);

  async function reload() {
    const res = await apiFetch('/api/pos/tables', {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    setTables(Array.isArray(data) ? data : []);
  }

  function openModal(t?: Table) {
    setError(null);
    if (t) {
      setEditingTable(t);
      setTNumber(t.number);
      setTLocation(t.location);
      setTCapacity(t.capacity.toString());
      setTStatus(t.status || 'FREE');
    } else {
      setEditingTable(null);
      setTNumber('');
      setTLocation(locationFilter);
      setTCapacity('2');
      setTStatus('FREE');
    }
    setShowTableModal(true);
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    const method = editingTable ? 'PATCH' : 'POST';
    const url = editingTable ? `/api/pos/tables/${editingTable.id}` : '/api/pos/tables';
    const res = await apiFetch(url, {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        number: tNumber,
        location: tLocation,
        capacity: parseInt(tCapacity),
        status: tStatus,
      }),
    });
    setSaving(false);
    if (res.ok) {
      setShowTableModal(false);
      setEditingTable(null);
      await reload();
    } else {
      const d = await res.json();
      setError(d.message || 'Erreur');
    }
  }

  async function confirmDelete() {
    if (!tableToDelete) return;
    await apiFetch(`/api/pos/tables/${tableToDelete.id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    setTableToDelete(null);
    await reload();
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-10 w-10 border-4 border-teal-400 border-t-transparent"></div>
      </div>
    );
  }

  const filtered = tables.filter((t) => {
    if (locationFilter !== 'ALL' && t.location !== locationFilter) return false;
    if (search.trim() && !t.number.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const counts = {
    total: tables.length,
    free: tables.filter((t) => t.status === 'FREE').length,
    occupied: tables.filter((t) => t.status === 'OCCUPIED').length,
    reserved: tables.filter((t) => t.status === 'RESERVED').length,
    cleaning: tables.filter((t) => t.status === 'CLEANING').length,
  };

  const filteredStats = {
    count: filtered.length,
    capacity: filtered.reduce((sum, t) => sum + (t.capacity || 0), 0),
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Plan de salle</h1>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-sm">
            <span className="text-slate-500">{counts.total} table{counts.total > 1 ? 's' : ''}</span>
            <span className="text-slate-300">·</span>
            <span className="text-green-600 font-bold">{counts.free} libre{counts.free > 1 ? 's' : ''}</span>
            <span className="text-slate-300">·</span>
            <span className="text-red-600 font-bold">{counts.occupied} occupee{counts.occupied > 1 ? 's' : ''}</span>
            {counts.reserved > 0 && (
              <>
                <span className="text-slate-300">·</span>
                <span className="text-amber-600 font-bold">{counts.reserved} reservee{counts.reserved > 1 ? 's' : ''}</span>
              </>
            )}
            {counts.cleaning > 0 && (
              <>
                <span className="text-slate-300">·</span>
                <span className="text-slate-500 font-bold">{counts.cleaning} a nettoyer</span>
              </>
            )}
          </div>
        </div>
        <Button
          onClick={() => openModal()}
          icon={
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
            </svg>
          }
        >
          Ajouter une table
        </Button>
      </div>

      {/* Recherche + Toggle view */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-3">
        <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center">
          <div className="relative flex-1">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
              </svg>
            </span>
            <input
              type="text"
              placeholder="Rechercher une table par numero..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:ring-2 focus:ring-teal-400 focus:border-teal-400 focus:bg-white transition"
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-700">✕</button>
            )}
          </div>
          <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-0.5 shrink-0 self-start sm:self-auto">
            <button
              onClick={() => setView('confort')}
              className={`px-3 py-1.5 rounded-md text-xs font-bold transition ${view === 'confort' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              Confort
            </button>
            <button
              onClick={() => setView('compact')}
              className={`px-3 py-1.5 rounded-md text-xs font-bold transition ${view === 'compact' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              Compact
            </button>
          </div>
        </div>
      </div>

      {/* Tabs zones */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-2 flex gap-2 overflow-x-auto">
        <button
          onClick={() => setLocationFilter('ALL')}
          className={`flex items-center gap-2 px-4 py-3 rounded-xl font-semibold whitespace-nowrap transition ${
            locationFilter === 'ALL'
              ? 'bg-slate-900 text-white shadow-md'
              : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
          }`}
        >
          <span>Toutes</span>
          <span className={`text-xs px-2 py-0.5 rounded-full ${locationFilter === 'ALL' ? 'bg-white/30' : 'bg-white'}`}>
            {counts.total}
          </span>
        </button>
        {LOCATIONS.map((loc) => {
          const isActive = locationFilter === loc.id;
          const count = tables.filter((t) => t.location === loc.id).length;
          const cap = tables.filter((t) => t.location === loc.id).reduce((s, t) => s + (t.capacity || 0), 0);
          if (count === 0 && !isActive) return null;
          return (
            <button
              key={loc.id}
              onClick={() => setLocationFilter(loc.id)}
              className={`flex items-center gap-2 px-4 py-3 rounded-xl font-semibold whitespace-nowrap transition ${
                isActive
                  ? `bg-linear-to-r ${loc.gradient} text-white shadow-md`
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              <span>{loc.label}</span>
              <span className={`text-xs px-2 py-0.5 rounded-full ${isActive ? 'bg-white/30' : 'bg-white'}`}>
                {count}
              </span>
              {cap > 0 && (
                <span className={`text-[10px] ${isActive ? 'opacity-80' : 'opacity-60'}`}>
                  {cap} pl.
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Grid */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4 sm:p-6">
        {filtered.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center text-2xl mx-auto mb-3">🪑</div>
            <p className="text-slate-500 font-semibold">
              {search || locationFilter !== 'ALL' ? 'Aucune table ne correspond' : 'Aucune table'}
            </p>
            <p className="text-xs text-slate-400 mt-1">
              {search ? 'Essayez un autre numero' : 'Ajoutez une table pour commencer'}
            </p>
            {(search || locationFilter !== 'ALL') && (
              <button
                onClick={() => { setSearch(''); setLocationFilter('ALL'); }}
                className="mt-3 text-xs font-bold text-teal-600 hover:underline"
              >
                Reinitialiser les filtres
              </button>
            )}
          </div>
        ) : view === 'confort' ? (
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-4">
            {filtered.map((t) => (
              <button
                key={t.id}
                onClick={() => openModal(t)}
                className={`group aspect-square rounded-3xl p-4 flex flex-col items-center justify-center transition-all hover:-translate-y-1 hover:shadow-xl ${
                  t.status === 'FREE'
                    ? 'bg-linear-to-br from-green-400 to-emerald-500 text-white'
                    : t.status === 'OCCUPIED'
                    ? 'bg-linear-to-br from-red-400 to-rose-500 text-white'
                    : t.status === 'RESERVED'
                    ? 'bg-linear-to-br from-amber-400 to-orange-500 text-white'
                    : 'bg-linear-to-br from-slate-300 to-slate-400 text-white'
                }`}
              >
                <div className="text-3xl font-black">{t.number}</div>
                <div className="text-xs opacity-90 mt-1">{t.capacity} pl.</div>
                {locationFilter === 'ALL' && (() => {
                  const z = ZONE_SHORT[t.location] || { code: t.location.slice(0, 4), bg: 'bg-slate-600' };
                  return (
                    <span className={'mt-1.5 text-[8px] font-black tracking-wider px-1.5 py-0.5 rounded ' + z.bg + ' text-white/90'}>
                      {z.code}
                    </span>
                  );
                })()}
              </button>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-2">
            {filtered.map((t) => (
              <button
                key={t.id}
                onClick={() => openModal(t)}
                title={`${t.number} - ${t.capacity} pl. - ${t.status}`}
                className={`aspect-square rounded-xl flex flex-col items-center justify-center transition-all hover:scale-105 hover:shadow-lg ${
                  t.status === 'FREE'
                    ? 'bg-green-500 text-white'
                    : t.status === 'OCCUPIED'
                    ? 'bg-red-500 text-white'
                    : t.status === 'RESERVED'
                    ? 'bg-amber-500 text-white'
                    : 'bg-slate-400 text-white'
                }`}
              >
                <div className="text-base font-black leading-none">{t.number}</div>
                <div className="text-[9px] opacity-90 mt-0.5">{t.capacity}p</div>
                {locationFilter === 'ALL' && (() => {
                  const z = ZONE_SHORT[t.location];
                  return (
                    <div className="text-[7px] opacity-70 font-black tracking-wider">{z?.code || t.location.slice(0,3)}</div>
                  );
                })()}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Modal */}
      <Modal
        open={showTableModal}
        onClose={() => {
          setShowTableModal(false);
          setEditingTable(null);
        }}
        title={editingTable ? 'Modifier la table' : 'Nouvelle table'}
        subtitle={editingTable ? editingTable.number : 'Ajouter une table'}
        icon={<span className="text-2xl">Table</span>}
        size="md"
        footer={
          <div className="flex gap-3">
            <Button
              variant="secondary"
              onClick={() => {
                setShowTableModal(false);
                setEditingTable(null);
              }}
            >
              Annuler
            </Button>
            {editingTable && (
              <button
                type="button"
                onClick={() => {
                  setTableToDelete(editingTable);
                  setShowTableModal(false);
                }}
                className="px-4 py-2.5 bg-red-50 border-2 border-red-200 text-red-600 rounded-xl font-bold text-sm hover:bg-red-100 transition"
              >
                Suppr
              </button>
            )}
            <button
              type="submit"
              form="table-form"
              disabled={saving}
              className="flex-1 bg-linear-to-r from-blue-600 to-teal-500 text-white py-2.5 rounded-xl font-semibold disabled:opacity-50"
            >
              {saving ? 'Enregistrement...' : editingTable ? 'Enregistrer' : 'Creer'}
            </button>
          </div>
        }
      >
        <form id="table-form" onSubmit={save} className="space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">
              {error}
            </div>
          )}
          <FormField label="Numero" required>
            <Input
              type="text"
              value={tNumber}
              onChange={(e) => setTNumber(e.target.value)}
              placeholder="T1, P5..."
              required
            />
          </FormField>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Zone">
              <Select value={tLocation} onChange={(e) => setTLocation(e.target.value)}>
                {LOCATIONS.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.label}
                  </option>
                ))}
              </Select>
            </FormField>
            <FormField label="Capacite">
              <Input
                type="number"
                min="1"
                value={tCapacity}
                onChange={(e) => setTCapacity(e.target.value)}
              />
            </FormField>
          </div>
          <FormField label="Statut">
            <Select value={tStatus} onChange={(e) => setTStatus(e.target.value)}>
              {STATUS_OPTIONS.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </Select>
          </FormField>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!tableToDelete}
        title="Supprimer la table"
        message={`Supprimer "${tableToDelete?.number}" ?`}
        onClose={() => setTableToDelete(null)}
        onConfirm={confirmDelete}
      />
    </div>
  );
}
