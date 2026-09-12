'use client';

import { useState, useEffect } from 'react';
import ConfirmDialog from '../../../../components/ConfirmDialog';
import { Modal, Button, Badge, PageHeader, FormField, Input, Select, Textarea } from '../../../../components/ui';
import { usePagination } from '../../../../lib/usePagination';
import { Pagination } from '../../../../lib/Pagination';

const ROOM_STATUS: Record<string, { label: string; variant: any }> = {
  AVAILABLE: { label: 'Disponible', variant: 'success' },
  OCCUPIED: { label: 'Occupée', variant: 'danger' },
  CLEANING: { label: 'Ménage', variant: 'warning' },
  MAINTENANCE: { label: 'Maintenance', variant: 'warning' },
  OUT_OF_ORDER: { label: 'Hors service', variant: 'neutral' },
};

export default function ChambresPage() {
  const [tab, setTab] = useState<'rooms' | 'types'>('rooms');
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [filterType, setFilterType] = useState<string>('ALL');
  const [sort, setSort] = useState<'number' | 'floor' | 'status'>('number');
  const [rooms, setRooms] = useState<any[]>([]);
  const [roomTypes, setRoomTypes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [showRoomModal, setShowRoomModal] = useState(false);
  const [editingRoom, setEditingRoom] = useState<any>(null);
  const [roomToDelete, setRoomToDelete] = useState<any>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const [rNumber, setRNumber] = useState('');
  const [rFloor, setRFloor] = useState('');
  const [rStatus, setRStatus] = useState('AVAILABLE');
  const [rNotes, setRNotes] = useState('');
  const [rTypeId, setRTypeId] = useState('');

  const [showTypeModal, setShowTypeModal] = useState(false);
  const [editingType, setEditingType] = useState<any>(null);
  const [typeToDelete, setTypeToDelete] = useState<any>(null);
  const [tName, setTName] = useState('');
  const [tCapacity, setTCapacity] = useState('1');
  const [tPrice, setTPrice] = useState('');
  const [tDescription, setTDescription] = useState('');

  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : '';

  async function loadRooms() {
    const res = await fetch('/api/hotel/rooms', { headers: { Authorization: `Bearer ${token}` } });
    const data = await res.json();
    setRooms(Array.isArray(data) ? data : []);
  }

  async function loadRoomTypes() {
    const res = await fetch('/api/hotel/room-types', { headers: { Authorization: `Bearer ${token}` } });
    const data = await res.json();
    setRoomTypes(Array.isArray(data) ? data : []);
  }

  useEffect(() => {
    Promise.all([loadRooms(), loadRoomTypes()]).catch(console.error).finally(() => setLoading(false));
  }, []);

  function openRoomModal(room?: any) {
    setError(null);
    if (room) {
      setEditingRoom(room);
      setRNumber(room.number);
      setRFloor(room.floor?.toString() || '');
      setRStatus(room.status);
      setRNotes(room.notes || '');
      setRTypeId(room.roomTypeId);
    } else {
      setEditingRoom(null);
      setRNumber(''); setRFloor(''); setRStatus('AVAILABLE'); setRNotes('');
      setRTypeId(roomTypes[0]?.id || '');
    }
    setShowRoomModal(true);
  }

  async function saveRoom(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    const method = editingRoom ? 'PATCH' : 'POST';
    const url = editingRoom ? `/api/hotel/rooms/${editingRoom.id}` : '/api/hotel/rooms';
    const res = await fetch(url, {
      method,
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        number: rNumber,
        floor: rFloor ? parseInt(rFloor) : null,
        status: rStatus,
        notes: rNotes || null,
        roomTypeId: rTypeId,
      }),
    });
    setSaving(false);
    if (res.ok) {
      setShowRoomModal(false);
      await loadRooms();
    } else {
      const data = await res.json();
      setError(data.message || 'Erreur');
    }
  }

  async function confirmDeleteRoom() {
    if (!roomToDelete) return;
    setIsDeleting(true);
    await fetch(`/api/hotel/rooms/${roomToDelete.id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
    await loadRooms();
    setRoomToDelete(null);
    setIsDeleting(false);
  }

  function openTypeModal(t?: any) {
    setError(null);
    if (t) {
      setEditingType(t);
      setTName(t.name); setTCapacity(t.capacity.toString());
      setTPrice(t.basePrice.toString()); setTDescription(t.description || '');
    } else {
      setEditingType(null);
      setTName(''); setTCapacity('1'); setTPrice(''); setTDescription('');
    }
    setShowTypeModal(true);
  }

  async function saveType(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    const method = editingType ? 'PATCH' : 'POST';
    const url = editingType ? `/api/hotel/room-types/${editingType.id}` : '/api/hotel/room-types';
    const res = await fetch(url, {
      method,
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: tName,
        capacity: parseInt(tCapacity),
        basePrice: parseFloat(tPrice) || 0,
        description: tDescription || null,
      }),
    });
    setSaving(false);
    if (res.ok) {
      setShowTypeModal(false);
      await loadRoomTypes();
    } else {
      const data = await res.json();
      setError(data.message || 'Erreur');
    }
  }

  async function confirmDeleteType() {
    if (!typeToDelete) return;
    setIsDeleting(true);
    await fetch(`/api/hotel/room-types/${typeToDelete.id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
    await loadRoomTypes();
    setTypeToDelete(null);
    setIsDeleting(false);
  }

  const filteredRooms = rooms.filter(r => {
    if (filterStatus !== 'ALL' && r.status !== filterStatus) return false;
    if (filterType !== 'ALL' && r.roomTypeId !== filterType) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      const hay = `${r.number} ${r.roomType?.name || ''} ${r.notes || ''}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  }).sort((a, b) => {
    if (sort === 'floor') return (a.floor || 0) - (b.floor || 0);
    if (sort === 'status') return (a.status || '').localeCompare(b.status || '');
    return String(a.number).localeCompare(String(b.number), undefined, { numeric: true });
  });

  const pagRooms = usePagination(filteredRooms, { perPageDefault: 15 });

  if (loading) return <div className="flex justify-center items-center h-64">Chargement...</div>;

  const totalRooms = rooms.length;
  const available = rooms.filter((r) => r.status === 'AVAILABLE').length;
  const occupied = rooms.filter((r) => r.status === 'OCCUPIED').length;
  const cleaning = rooms.filter((r) => r.status === 'CLEANING').length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Chambres"
        subtitle={`${totalRooms} chambres • ${available} disponibles • ${occupied} occupées • ${cleaning} en ménage`}
        actions={
          <Button
            onClick={() => openRoomModal()}
            icon={
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
              </svg>
            }
          >
            Ajouter une chambre
          </Button>
        }
      />

      {/* Onglets */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-1 flex gap-1 w-fit">
        <button
          onClick={() => setTab('rooms')}
          className={`px-4 py-2 rounded-xl text-sm font-medium transition ${
            tab === 'rooms' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-50'
          }`}
        >
          Chambres ({rooms.length})
        </button>
        <button
          onClick={() => setTab('types')}
          className={`px-4 py-2 rounded-xl text-sm font-medium transition ${
            tab === 'types' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-50'
          }`}
        >
          Types ({roomTypes.length})
        </button>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">{error}</div>
      )}

      {/* Chambres */}
      {tab === 'rooms' && (
        <>
        {/* Barre recherche + filtres */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-3 space-y-3">
          <div className="relative">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
              </svg>
            </span>
            <input
              type="text"
              placeholder="Rechercher par numero, type..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:ring-2 focus:ring-teal-400 focus:border-teal-400 focus:bg-white transition"
            />
          </div>
          <div className="flex flex-wrap gap-1.5">
            {[
              { v: 'ALL', l: 'Toutes' },
              { v: 'AVAILABLE', l: 'Disponibles' },
              { v: 'OCCUPIED', l: 'Occupees' },
              { v: 'CLEANING', l: 'Menage' },
              { v: 'MAINTENANCE', l: 'Maintenance' },
            ].map(f => (
              <button
                key={f.v}
                onClick={() => setFilterStatus(f.v)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${filterStatus === f.v ? 'bg-slate-900 text-white shadow-md' : 'bg-white border border-slate-200 text-slate-600 hover:border-slate-400'}`}
              >
                {f.l}
              </button>
            ))}
            {roomTypes.length > 0 && (
              <>
                <span className="w-px bg-slate-200 mx-1"></span>
                <button
                  onClick={() => setFilterType('ALL')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${filterType === 'ALL' ? 'bg-slate-900 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:border-slate-400'}`}
                >
                  Tous types
                </button>
                {roomTypes.map((t: any) => (
                  <button
                    key={t.id}
                    onClick={() => setFilterType(t.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${filterType === t.id ? 'bg-slate-900 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:border-slate-400'}`}
                  >
                    {t.name}
                  </button>
                ))}
              </>
            )}
            <select
              value={sort}
              onChange={e => setSort(e.target.value as any)}
              className="ml-auto px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-700 cursor-pointer"
            >
              <option value="number">N° croissant</option>
              <option value="floor">Etage</option>
              <option value="status">Statut</option>
            </select>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 border-b border-gray-200">
                <tr>
                  <th className="p-4 font-semibold text-slate-600">N°</th>
                  <th className="p-4 font-semibold text-slate-600">Étage</th>
                  <th className="p-4 font-semibold text-slate-600">Type</th>
                  <th className="p-4 font-semibold text-slate-600">Capacité</th>
                  <th className="p-4 font-semibold text-slate-600">Prix/nuit</th>
                  <th className="p-4 font-semibold text-slate-600">Statut</th>
                  <th className="p-4 font-semibold text-slate-600">Notes</th>
                  <th className="p-4 font-semibold text-slate-600 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {pagRooms.pageItems.map((r) => {
                  const meta = ROOM_STATUS[r.status] || ROOM_STATUS.AVAILABLE;
                  return (
                    <tr key={r.id} className="hover:bg-teal-50/40 transition">
                      <td className="p-4 font-bold text-slate-900">{r.number}</td>
                      <td className="p-4 text-slate-600">{r.floor ?? '—'}</td>
                      <td className="p-4 text-slate-600">{r.roomType?.name || '—'}</td>
                      <td className="p-4 text-slate-600">{r.roomType?.capacity || 1} pers.</td>
                      <td className="p-4 text-slate-600 font-semibold">
                        {r.roomType?.basePrice ? r.roomType.basePrice.toLocaleString('fr-FR') + ' Ar' : '—'}
                      </td>
                      <td className="p-4"><Badge variant={meta.variant}>{meta.label}</Badge></td>
                      <td className="p-4 text-slate-500 text-xs max-w-xs truncate">{r.notes || '—'}</td>
                      <td className="p-4 text-center">
                        <button onClick={() => openRoomModal(r)} className="text-blue-600 hover:underline mr-2 text-sm">Modifier</button>
                        <button onClick={() => setRoomToDelete(r)} className="text-red-600 hover:underline text-sm">Supprimer</button>
                      </td>
                    </tr>
                  );
                })}
                {pagRooms.pageItems.length === 0 && (
                  <tr><td colSpan={8} className="p-8 text-center text-slate-400">Aucune chambre ne correspond aux filtres</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <Pagination
          page={pagRooms.page}
          totalPages={pagRooms.totalPages}
          onPageChange={pagRooms.setPage}
          perPage={pagRooms.perPage}
          perPageOptions={pagRooms.perPageOptions}
          onPerPageChange={pagRooms.setPerPage}
          total={pagRooms.total}
        />
        </>
      )}

      {/* Types */}
      {tab === 'types' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <Button variant="secondary" onClick={() => openTypeModal()}>+ Nouveau type</Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {roomTypes.map((t) => (
              <div key={t.id} className="bg-white rounded-2xl p-5 shadow-sm border border-gray-200">
                <div className="flex items-start justify-between mb-2">
                  <h3 className="font-bold text-slate-900">{t.name}</h3>
                  <Badge variant="info">{t._count?.rooms || 0} chambre{(t._count?.rooms || 0) > 1 ? 's' : ''}</Badge>
                </div>
                <p className="text-sm text-slate-500 mb-3">{t.description || 'Pas de description'}</p>
                <div className="flex items-center justify-between text-sm mb-3">
                  <span className="text-slate-600">{t.capacity} pers.</span>
                  <span className="font-bold text-slate-900">{t.basePrice.toLocaleString('fr-FR')} Ar / nuit</span>
                </div>
                <div className="flex gap-3 pt-3 border-t border-gray-100">
                  <button onClick={() => openTypeModal(t)} className="text-blue-600 text-sm hover:underline">Modifier</button>
                  <button onClick={() => setTypeToDelete(t)} className="text-red-600 text-sm hover:underline">Supprimer</button>
                </div>
              </div>
            ))}
            {roomTypes.length === 0 && (
              <div className="col-span-full text-center py-10 text-slate-400">Aucun type de chambre</div>
            )}
          </div>
        </div>
      )}

      {/* Modal Chambre */}
      <Modal
        open={showRoomModal}
        onClose={() => setShowRoomModal(false)}
        title={editingRoom ? 'Modifier la chambre' : 'Ajouter une chambre'}
        subtitle={editingRoom ? `Chambre ${editingRoom.number}` : 'Créez une nouvelle chambre'}
        icon={
          <svg className="w-6 h-6 text-white/80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
          </svg>
        }
        footer={
          <div className="flex gap-3">
            <Button variant="secondary" onClick={() => setShowRoomModal(false)}>Annuler</Button>
            <button
              type="submit"
              form="room-form"
              disabled={saving}
              className="flex-1 bg-linear-to-r from-blue-600 to-teal-500 text-white py-2.5 rounded-xl font-semibold hover:shadow-lg hover:shadow-teal-500/30 transition disabled:opacity-50 inline-flex items-center justify-center gap-2"
            >
              {saving ? 'Enregistrement...' : editingRoom ? 'Enregistrer' : 'Créer'}
            </button>
          </div>
        }
      >
        <form id="room-form" onSubmit={saveRoom} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Numéro" required>
              <Input type="text" value={rNumber} onChange={(e) => setRNumber(e.target.value)} placeholder="101" required />
            </FormField>
            <FormField label="Étage">
              <Input type="number" value={rFloor} onChange={(e) => setRFloor(e.target.value)} placeholder="1" />
            </FormField>
          </div>
          <FormField label="Type" required>
            <Select value={rTypeId} onChange={(e) => setRTypeId(e.target.value)} required>
              <option value="">— Choisir —</option>
              {roomTypes.map((t) => (
                <option key={t.id} value={t.id}>{t.name} ({t.basePrice.toLocaleString('fr-FR')} Ar)</option>
              ))}
            </Select>
          </FormField>
          <FormField label="Statut">
            <Select value={rStatus} onChange={(e) => setRStatus(e.target.value)}>
              {Object.entries(ROOM_STATUS).map(([k, v]) => (
                <option key={k} value={k}>{v.label}</option>
              ))}
            </Select>
          </FormField>
          <FormField label="Notes">
            <Textarea value={rNotes} onChange={(e) => setRNotes(e.target.value)} rows={2} />
          </FormField>
        </form>
      </Modal>

      {/* Modal Type */}
      <Modal
        open={showTypeModal}
        onClose={() => setShowTypeModal(false)}
        title={editingType ? 'Modifier le type' : 'Nouveau type de chambre'}
        subtitle={editingType ? editingType.name : 'Définissez un type de chambre'}
        icon={<span className="text-2xl">🛏️</span>}
        size="md"
        footer={
          <div className="flex gap-3">
            <Button variant="secondary" onClick={() => setShowTypeModal(false)}>Annuler</Button>
            <button
              type="submit"
              form="type-form"
              disabled={saving}
              className="flex-1 bg-linear-to-r from-blue-600 to-teal-500 text-white py-2.5 rounded-xl font-semibold hover:shadow-lg transition disabled:opacity-50"
            >
              {saving ? 'Enregistrement...' : editingType ? 'Enregistrer' : 'Créer'}
            </button>
          </div>
        }
      >
        <form id="type-form" onSubmit={saveType} className="space-y-4">
          <FormField label="Nom du type" required>
            <Input type="text" value={tName} onChange={(e) => setTName(e.target.value)} placeholder="Single, Double, Suite…" required />
          </FormField>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Capacité" required>
              <Input type="number" min="1" value={tCapacity} onChange={(e) => setTCapacity(e.target.value)} required />
            </FormField>
            <FormField label="Prix / nuit (Ar)" required>
              <Input type="number" value={tPrice} onChange={(e) => setTPrice(e.target.value)} placeholder="50000" required />
            </FormField>
          </div>
          <FormField label="Description">
            <Textarea value={tDescription} onChange={(e) => setTDescription(e.target.value)} rows={2} />
          </FormField>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!roomToDelete}
        title="Supprimer la chambre"
        message={`Voulez-vous vraiment supprimer la chambre ${roomToDelete?.number} ?`}
        onClose={() => setRoomToDelete(null)}
        onConfirm={confirmDeleteRoom}
        isLoading={isDeleting}
      />
      <ConfirmDialog
        open={!!typeToDelete}
        title="Supprimer le type"
        message={`Voulez-vous vraiment supprimer le type "${typeToDelete?.name}" ?`}
        onClose={() => setTypeToDelete(null)}
        onConfirm={confirmDeleteType}
        isLoading={isDeleting}
      />
    </div>
  );
}
