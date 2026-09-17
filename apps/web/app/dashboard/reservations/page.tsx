'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import CashStatusBanner from '../../../components/CashStatusBanner';
import { apiFetch, unwrap } from '../../../lib/api';
import ConfirmDialog from '../../../components/ConfirmDialog';
import { Modal, Button, Badge, PageHeader, FormField, Input, Select, Textarea } from '../../../components/ui';
import { usePagination } from '../../../lib/usePagination';
import { Pagination } from '../../../lib/Pagination';

const STATUS_META: Record<string, { label: string; variant: any; icon: string }> = {
  PENDING: { label: 'En attente', variant: 'warning', icon: '⏳' },
  CONFIRMED: { label: 'Confirmée', variant: 'info', icon: '✅' },
  CHECKED_IN: { label: 'Check-in', variant: 'success', icon: '🛎️' },
  CHECKED_OUT: { label: 'Check-out', variant: 'neutral', icon: '👋' },
  CANCELLED: { label: 'Annulée', variant: 'danger', icon: '❌' },
  NO_SHOW: { label: 'No-show', variant: 'warning', icon: '🚫' },
};

const STATUS_FILTERS = [
  { value: '', label: 'Toutes' },
  { value: 'PENDING', label: 'En attente' },
  { value: 'CONFIRMED', label: 'Confirmées' },
  { value: 'CHECKED_IN', label: 'En cours' },
  { value: 'CHECKED_OUT', label: 'Terminées' },
  { value: 'CANCELLED', label: 'Annulées' },
];

export default function ReservationsPage() {
  const [reservations, setReservations] = useState<any[]>([]);
  const [rooms, setRooms] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [sortKey, setSortKey] = useState<'checkInDate' | 'totalAmount'>('checkInDate');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [reservationToDelete, setReservationToDelete] = useState<any>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const [customerId, setCustomerId] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [clientSearch, setClientSearch] = useState('');
  const [showCustomerList, setShowCustomerList] = useState(false);
  const customerBoxRef = useRef<HTMLDivElement>(null);

  const [roomId, setRoomId] = useState('');
  const [checkInDate, setCheckInDate] = useState('');
  const [checkOutDate, setCheckOutDate] = useState('');
  const [adults, setAdults] = useState('1');
  const [children, setChildren] = useState('0');
  const [status, setStatus] = useState('PENDING');
  const [totalAmount, setTotalAmount] = useState('');
  const [paidAmount, setPaidAmount] = useState('0');
  const [notes, setNotes] = useState('');

  // Acompte
  const [depositModal, setDepositModal] = useState<any>(null);
  const [depositAmount, setDepositAmount] = useState('');
  const [depositMethod, setDepositMethod] = useState('CASH');
  const [depositNotes, setDepositNotes] = useState('');
  const [depositSaving, setDepositSaving] = useState(false);
  const [depositError, setDepositError] = useState<string | null>(null);

  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : '';

  async function loadAll() {
    const [rRes, roomRes, custRes] = await Promise.all([
      apiFetch('/api/hotel/reservations', { headers: { Authorization: `Bearer ${token}` } }),
      apiFetch('/api/hotel/rooms', { headers: { Authorization: `Bearer ${token}` } }),
      apiFetch('/api/partners?type=CUSTOMER', { headers: { Authorization: `Bearer ${token}` } }),
    ]);
    const [r, room, cust] = await Promise.all([rRes.json(), roomRes.json(), custRes.json()]);
    setReservations(unwrap(r));
    setRooms(unwrap(room));
    setCustomers(unwrap(cust));
  }

  useEffect(() => {
    loadAll().catch(console.error).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (customerBoxRef.current && !customerBoxRef.current.contains(e.target as Node)) {
        setShowCustomerList(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (!checkInDate || !checkOutDate || !roomId) return;
    const room = rooms.find((r) => r.id === roomId);
    if (!room?.roomType?.basePrice) return;
    const inD = new Date(checkInDate);
    const outD = new Date(checkOutDate);
    if (outD <= inD) return;
    const nights = Math.ceil((outD.getTime() - inD.getTime()) / (1000 * 60 * 60 * 24));
    setTotalAmount((nights * room.roomType.basePrice).toString());
  }, [checkInDate, checkOutDate, roomId, rooms]);

  const filteredCustomers = useMemo(() => {
    if (!clientSearch.trim()) return customers.slice(0, 20);
    const s = clientSearch.toLowerCase();
    return customers
      .filter(
        (c) =>
          c.firstName?.toLowerCase().includes(s) ||
          c.lastName?.toLowerCase().includes(s) ||
          c.phone?.toLowerCase().includes(s) ||
          c.email?.toLowerCase().includes(s)
      )
      .slice(0, 20);
  }, [customers, clientSearch]);

  const filtered = useMemo(() => {
    let list = reservations;
    if (statusFilter) list = list.filter((r) => r.status === statusFilter);
    if (dateFrom) list = list.filter((r) => new Date(r.checkInDate) >= new Date(dateFrom));
    if (dateTo) list = list.filter((r) => new Date(r.checkInDate) <= new Date(dateTo));
    if (search.trim()) {
      const s = search.toLowerCase();
      list = list.filter(
        (r) =>
          r.reference?.toLowerCase().includes(s) ||
          r.customer?.firstName?.toLowerCase().includes(s) ||
          r.customer?.lastName?.toLowerCase().includes(s) ||
          r.room?.number?.toLowerCase().includes(s)
      );
    }
    return [...list].sort((a, b) => {
      let va: any, vb: any;
      if (sortKey === 'checkInDate') { va = new Date(a.checkInDate).getTime(); vb = new Date(b.checkInDate).getTime(); }
      else { va = a.totalAmount; vb = b.totalAmount; }
      return sortDir === 'asc' ? va - vb : vb - va;
    });
  }, [reservations, statusFilter, search, dateFrom, dateTo, sortKey, sortDir]);

  const totals = useMemo(() => filtered.reduce(
    (acc, r) => {
      acc.total += r.totalAmount || 0;
      acc.paid += r.paidAmount || 0;
      return acc;
    },
    { total: 0, paid: 0 }
  ), [filtered]);

  const pag = usePagination(filtered, { perPageDefault: 15 });

  // Reset page quand filtres / tri changent
  useEffect(() => {
    pag.setPage(1);
  }, [search, statusFilter, dateFrom, dateTo, sortKey, sortDir]);

  const due = totals.total - totals.paid;

  async function saveDeposit(e: React.FormEvent) {
    e.preventDefault();
    if (!depositModal) return;
    setDepositSaving(true);
    try {
      const res = await apiFetch(`/api/hotel/reservations/${depositModal.id}/deposit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: parseFloat(depositAmount) || 0,
          method: depositMethod,
          notes: depositNotes,
        }),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.message || 'Erreur');
      }
      setDepositModal(null);
      setDepositAmount('');
      setDepositNotes('');
      await loadAll();
    } catch (err: any) {
      setDepositError(err.message || 'Erreur inconnue');
    } finally {
      setDepositSaving(false);
    }
  }

  function openDepositModal(r: any) {
    setDepositError(null);
    setDepositModal(r);
    const remaining = (r.totalAmount || 0) - (r.paidAmount || 0);
    // Par défaut : 30% du total
    setDepositAmount(Math.max(0, Math.round(r.totalAmount * 0.3)).toString());
    setDepositMethod('CASH');
    setDepositNotes('');
  }

  function openModal(r?: any) {
    setError(null);
    setShowCustomerList(false);
    setClientSearch('');
    if (r) {
      setEditing(r);
      setCustomerId(r.customerId);
      setSelectedCustomer(r.customer);
      setRoomId(r.roomId);
      setCheckInDate(r.checkInDate.slice(0, 10));
      setCheckOutDate(r.checkOutDate.slice(0, 10));
      setAdults(r.adults.toString());
      setChildren(r.children.toString());
      setStatus(r.status);
      setTotalAmount(r.totalAmount.toString());
      setPaidAmount(r.paidAmount.toString());
      setNotes(r.notes || '');
    } else {
      setEditing(null);
      setCustomerId(''); setSelectedCustomer(null);
      setRoomId('');
      setCheckInDate(''); setCheckOutDate('');
      setAdults('1'); setChildren('0');
      setStatus('PENDING'); setTotalAmount(''); setPaidAmount('0'); setNotes('');
    }
    setShowModal(true);
  }

  function pickCustomer(c: any) {
    setSelectedCustomer(c);
    setCustomerId(c.id);
    setShowCustomerList(false);
    setClientSearch('');
  }

  async function saveReservation(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    const method = editing ? 'PATCH' : 'POST';
    const url = editing ? `/api/hotel/reservations/${editing.id}` : '/api/hotel/reservations';
    const res = await apiFetch(url, {
      method,
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customerId, roomId, checkInDate, checkOutDate,
        adults: parseInt(adults) || 1,
        children: parseInt(children) || 0,
        status,
        totalAmount: parseFloat(totalAmount) || 0,
        paidAmount: parseFloat(paidAmount) || 0,
        notes: notes || null,
      }),
    });
    setSaving(false);
    if (res.ok) {
      setShowModal(false);
      await loadAll();
    } else {
      const data = await res.json();
      setError(data.message || 'Erreur');
    }
  }

  async function confirmDelete() {
    if (!reservationToDelete) return;
    setIsDeleting(true);
    await apiFetch(`/api/hotel/reservations/${reservationToDelete.id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
    await loadAll();
    setReservationToDelete(null);
    setIsDeleting(false);
  }

  async function quickCheckIn(r: any) {
    await apiFetch(`/api/hotel/reservations/${r.id}/check-in`, { method: 'PATCH', headers: { Authorization: `Bearer ${token}` } });
    await loadAll();
  }

  async function quickCheckOut(r: any) {
    await apiFetch(`/api/hotel/reservations/${r.id}/check-out`, { method: 'PATCH', headers: { Authorization: `Bearer ${token}` } });
    await loadAll();
  }

  function toggleSort(k: typeof sortKey) {
    if (sortKey === k) setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    else { setSortKey(k); setSortDir('desc'); }
  }

  function nights(r: any) {
    const i = new Date(r.checkInDate), o = new Date(r.checkOutDate);
    return Math.max(1, Math.ceil((o.getTime() - i.getTime()) / (1000 * 60 * 60 * 24)));
  }

  if (loading) return <div className="flex justify-center items-center h-64">Chargement...</div>;

  const availableRooms = rooms.filter((r) => r.status === 'AVAILABLE' || r.status === 'CLEANING' || editing);

  return (
    <div className="space-y-4">
      <CashStatusBanner />

      <PageHeader
        title="Réservations"
        subtitle={`${filtered.length} réservation${filtered.length > 1 ? 's' : ''} affichée${filtered.length > 1 ? 's' : ''}`}
        actions={
          <div className="flex gap-2">
            <a
              href="/dashboard/reservations/kanban"
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-white border-2 border-slate-300 rounded-xl text-sm font-semibold text-slate-700 hover:bg-slate-900 hover:text-white hover:border-slate-900 transition shadow-sm whitespace-nowrap"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
              </svg>
              Vue Kanban
            </a>
            <Button
              onClick={() => openModal()}
              icon={
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                </svg>
              }
            >
              Nouvelle réservation
            </Button>
          </div>
        }
      />

      {/* Filtres */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4 space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div className="md:col-span-2">
            <Input
              type="text"
              placeholder="Rechercher..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              icon={
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              }
            />
          </div>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-teal-400"
          />
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-teal-400"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => setStatusFilter(f.value)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                statusFilter === f.value ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {f.label}
            </button>
          ))}
          {(search || dateFrom || dateTo || statusFilter) && (
            <button
              onClick={() => { setSearch(''); setDateFrom(''); setDateTo(''); setStatusFilter(''); }}
              className="px-3 py-1.5 rounded-lg text-xs font-medium bg-red-50 text-red-600 hover:bg-red-100"
            >
              ✕ Effacer
            </button>
          )}
        </div>
      </div>

      {/* Tableau */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-100 border-b-2 border-slate-200">
              <tr>
                <th className="p-3 font-semibold text-slate-700 whitespace-nowrap">Référence</th>
                <th className="p-3 font-semibold text-slate-700 whitespace-nowrap">Client</th>
                <th className="p-3 font-semibold text-slate-700 whitespace-nowrap">Chambre</th>
                <th onClick={() => toggleSort('checkInDate')} className="p-3 font-semibold text-slate-700 whitespace-nowrap cursor-pointer hover:bg-slate-200 select-none">
                  Arrivée {sortKey === 'checkInDate' && (sortDir === 'asc' ? '↑' : '↓')}
                </th>
                <th className="p-3 font-semibold text-slate-700 whitespace-nowrap">Départ</th>
                <th className="p-3 font-semibold text-slate-700 whitespace-nowrap text-center">Nuits</th>
                <th onClick={() => toggleSort('totalAmount')} className="p-3 font-semibold text-slate-700 whitespace-nowrap cursor-pointer hover:bg-slate-200 select-none text-right">
                  Total {sortKey === 'totalAmount' && (sortDir === 'asc' ? '↑' : '↓')}
                </th>
                <th className="p-3 font-semibold text-slate-700 whitespace-nowrap text-right">Reste</th>
                <th className="p-3 font-semibold text-slate-700 whitespace-nowrap">Statut</th>
                <th className="p-3 font-semibold text-slate-700 whitespace-nowrap text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {pag.pageItems.map((r) => {
                const meta = STATUS_META[r.status] || STATUS_META.PENDING;
                const reste = (r.totalAmount || 0) - (r.paidAmount || 0);
                return (
                  <tr key={r.id} className="hover:bg-teal-50/40 transition">
                    <td className="p-3 font-mono text-xs font-semibold text-slate-700 whitespace-nowrap">{r.reference}</td>
                    <td className="p-3 whitespace-nowrap">
                      <div className="font-medium text-slate-900">{r.customer?.firstName} {r.customer?.lastName}</div>
                      <div className="text-xs text-slate-500">{r.customer?.phone || '—'}</div>
                    </td>
                    <td className="p-3 whitespace-nowrap">
                      <div className="font-medium text-slate-900">N° {r.room?.number}</div>
                      <div className="text-xs text-slate-500">{r.room?.roomType?.name}</div>
                    </td>
                    <td className="p-3 text-slate-600 whitespace-nowrap">{new Date(r.checkInDate).toLocaleDateString('fr-FR')}</td>
                    <td className="p-3 text-slate-600 whitespace-nowrap">{new Date(r.checkOutDate).toLocaleDateString('fr-FR')}</td>
                    <td className="p-3 text-center font-semibold text-slate-700">{nights(r)}</td>
                    <td className="p-3 text-right font-semibold text-slate-900 whitespace-nowrap">{r.totalAmount.toLocaleString('fr-FR')} Ar</td>
                    <td className={`p-3 text-right font-semibold whitespace-nowrap ${reste > 0 ? 'text-red-600' : 'text-green-600'}`}>{reste.toLocaleString('fr-FR')} Ar</td>
                    <td className="p-3 whitespace-nowrap">
                      <Badge variant={meta.variant}>{meta.icon} {meta.label}</Badge>
                    </td>
                    <td className="p-3 whitespace-nowrap text-center">
                      {(r.status === 'PENDING' || r.status === 'CONFIRMED') && (
                        <button onClick={() => quickCheckIn(r)} className="text-xs bg-green-50 text-green-700 px-2 py-1 rounded hover:bg-green-100 mr-1" title="Check-in">🛎️</button>
                      )}
                      {r.status === 'CHECKED_IN' && (
                        <button onClick={() => quickCheckOut(r)} className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded hover:bg-blue-100 mr-1" title="Check-out">👋</button>
                      )}
                      <a href={`/dashboard/reservations/${r.id}`} className="text-xs text-teal-600 hover:underline mr-2" title="Folio">🧾</a>
                      {((r.totalAmount || 0) - (r.paidAmount || 0)) > 0 && (
                        <button onClick={() => openDepositModal(r)} className="text-xs text-emerald-600 hover:underline mr-2" title="Enregistrer un acompte">💰</button>
                      )}
                      <button onClick={() => openModal(r)} className="text-xs text-blue-600 hover:underline mr-2">Modif.</button>
                      <button onClick={() => setReservationToDelete(r)} className="text-xs text-red-600 hover:underline">Suppr.</button>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr><td colSpan={10} className="p-8 text-center text-slate-400">Aucune réservation</td></tr>
              )}
            </tbody>
            {filtered.length > 0 && (
              <tfoot className="bg-slate-50 border-t-2 border-slate-200 font-semibold">
                <tr>
                  <td colSpan={6} className="p-3 text-right text-slate-600">TOTAUX ({filtered.length})</td>
                  <td className="p-3 text-right text-slate-900 whitespace-nowrap">{totals.total.toLocaleString('fr-FR')} Ar</td>
                  <td className={`p-3 text-right whitespace-nowrap ${due > 0 ? 'text-red-600' : 'text-green-600'}`}>{due.toLocaleString('fr-FR')} Ar</td>
                  <td colSpan={2}></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {/* Modal */}
      <Pagination
        page={pag.page}
        totalPages={pag.totalPages}
        onPageChange={pag.setPage}
        perPage={pag.perPage}
        perPageOptions={pag.perPageOptions}
        onPerPageChange={pag.setPerPage}
        total={pag.total}
      />

      <Modal
        open={showModal}
        onClose={() => setShowModal(false)}
        title={editing ? `Modifier ${editing.reference}` : 'Nouvelle réservation'}
        subtitle={editing ? 'Mettez à jour la réservation' : 'Enregistrez une nouvelle réservation'}
        icon={<span className="text-2xl">📅</span>}
        footer={
          <div className="flex gap-3">
            <Button variant="secondary" onClick={() => setShowModal(false)}>Annuler</Button>
            <button
              type="submit"
              form="reservation-form"
              disabled={saving}
              className="flex-1 bg-linear-to-r from-blue-600 to-teal-500 text-white py-2.5 rounded-xl font-semibold hover:shadow-lg hover:shadow-teal-500/30 transition disabled:opacity-50 inline-flex items-center justify-center gap-2"
            >
              {saving ? 'Enregistrement...' : editing ? 'Enregistrer' : 'Créer la réservation'}
            </button>
          </div>
        }
      >
        <form id="reservation-form" onSubmit={saveReservation} className="space-y-6">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">{error}</div>
          )}

          {/* Client */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-slate-700">
                Client <span className="text-red-500">*</span>
              </label>
              <a
                href="/dashboard/crm"
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-blue-600 hover:underline"
              >
                Gérer les clients →
              </a>
            </div>

            {selectedCustomer ? (
              <div className="border border-teal-300 bg-teal-50/60 rounded-xl p-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-teal-500 text-white rounded-full flex items-center justify-center font-bold">
                    {selectedCustomer.firstName?.charAt(0)}{selectedCustomer.lastName?.charAt(0)}
                  </div>
                  <div>
                    <div className="font-semibold text-slate-900">{selectedCustomer.firstName} {selectedCustomer.lastName}</div>
                    <div className="text-xs text-slate-600">{selectedCustomer.phone || '—'} • {selectedCustomer.email || '—'}</div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => { setSelectedCustomer(null); setCustomerId(''); }}
                  className="text-xs text-red-600 hover:underline"
                >
                  Changer
                </button>
              </div>
            ) : (
              <div ref={customerBoxRef} className="relative">
                <Input
                  type="text"
                  placeholder="Rechercher un client..."
                  value={clientSearch}
                  onChange={(e) => { setClientSearch(e.target.value); setShowCustomerList(true); }}
                  onFocus={() => setShowCustomerList(true)}
                />
                {showCustomerList && (
                  <div className="absolute z-20 mt-1 w-full bg-white border border-gray-200 rounded-xl shadow-lg max-h-64 overflow-y-auto">
                    {filteredCustomers.length === 0 ? (
                      <div className="p-4 text-center text-sm text-slate-400">
                        Aucun client trouvé. <a href="/dashboard/crm" target="_blank" className="text-blue-600 hover:underline">Créez-en un</a>.
                      </div>
                    ) : (
                      filteredCustomers.map((c) => (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => pickCustomer(c)}
                          className="w-full text-left px-4 py-2.5 hover:bg-teal-50 flex items-center gap-3 border-b border-gray-100 last:border-b-0"
                        >
                          <div className="w-8 h-8 bg-slate-200 text-slate-700 rounded-full flex items-center justify-center text-xs font-bold">
                            {c.firstName?.charAt(0)}{c.lastName?.charAt(0)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-slate-900 text-sm truncate">{c.firstName} {c.lastName}</div>
                            <div className="text-xs text-slate-500 truncate">{c.phone || c.email || '—'}</div>
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Séjour */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-1 h-4 bg-linear-to-b from-blue-500 to-teal-500 rounded-full"></div>
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Séjour</h3>
            </div>
            <div className="space-y-4">
              <FormField label="Chambre" required>
                <Select value={roomId} onChange={(e) => setRoomId(e.target.value)} required>
                  <option value="">— Sélectionner —</option>
                  {availableRooms.map((rm) => (
                    <option key={rm.id} value={rm.id}>
                      N° {rm.number} — {rm.roomType?.name} ({(rm.roomType?.basePrice || 0).toLocaleString('fr-FR')} Ar)
                    </option>
                  ))}
                </Select>
              </FormField>

              <div className="grid grid-cols-2 gap-4">
                <FormField label="Arrivée" required>
                  <Input type="date" value={checkInDate} onChange={(e) => setCheckInDate(e.target.value)} required />
                </FormField>
                <FormField label="Départ" required>
                  <Input type="date" value={checkOutDate} onChange={(e) => setCheckOutDate(e.target.value)} required />
                </FormField>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField label="Adultes">
                  <Input type="number" min="1" value={adults} onChange={(e) => setAdults(e.target.value)} />
                </FormField>
                <FormField label="Enfants">
                  <Input type="number" min="0" value={children} onChange={(e) => setChildren(e.target.value)} />
                </FormField>
              </div>
            </div>
          </div>

          {/* Paiement */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-1 h-4 bg-linear-to-b from-blue-500 to-teal-500 rounded-full"></div>
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Paiement</h3>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <FormField label="Total (Ar)" hint="Calculé auto. Modifiable.">
                <Input type="number" value={totalAmount} onChange={(e) => setTotalAmount(e.target.value)} />
              </FormField>
              <FormField label="Payé (Ar)">
                <Input type="number" value={paidAmount} onChange={(e) => setPaidAmount(e.target.value)} />
              </FormField>
            </div>
          </div>

          {/* Détails */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-1 h-4 bg-linear-to-b from-blue-500 to-teal-500 rounded-full"></div>
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Détails</h3>
            </div>
            <div className="space-y-4">
              <FormField label="Statut">
                <Select value={status} onChange={(e) => setStatus(e.target.value)}>
                  {Object.entries(STATUS_META).map(([k, v]) => (
                    <option key={k} value={k}>{v.label}</option>
                  ))}
                </Select>
              </FormField>
              <FormField label="Notes">
                <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
              </FormField>
            </div>
          </div>
        </form>
      </Modal>

      {/* Modal d'erreur caisse */}
      {depositError && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm"
            onClick={() => setDepositError(null)}
          ></div>
          <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden">
            {/* Bandeau rouge */}
            <div className="bg-gradient-to-r from-red-500 to-rose-600 px-6 py-5 flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center shrink-0">
                <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-lg font-black text-white">
                  {depositError.toLowerCase().includes('caisse')
                    ? 'Caisse fermée'
                    : depositError.toLowerCase().includes('solde') || depositError.toLowerCase().includes('dépasse')
                    ? 'Montant trop élevé'
                    : 'Erreur d\'encaissement'}
                </h2>
                <p className="text-xs text-red-100 mt-0.5">
                  {depositError.toLowerCase().includes('caisse')
                    ? 'Action impossible sans caisse ouverte'
                    : 'Veuillez corriger le montant'}
                </p>
              </div>
            </div>

            {/* Corps */}
            <div className="p-6 space-y-4">
              <div className="bg-red-50 border border-red-200 rounded-2xl p-4">
                <p className="text-sm text-red-800 leading-relaxed">
                  {depositError}
                </p>
              </div>

              {depositError.toLowerCase().includes('caisse') ? (
                <div className="bg-slate-50 rounded-2xl p-4">
                  <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest mb-2">
                    Que faire ?
                  </p>
                  <ol className="text-xs text-slate-700 space-y-1.5 pl-4 list-decimal">
                    <li>Cliquez sur "Ouvrir la caisse" ci-dessous</li>
                    <li>Ouvrez une session sur la caisse souhaitée</li>
                    <li>Revenez ici et recommencez l'encaissement</li>
                  </ol>
                </div>
              ) : (
                <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
                  <p className="text-[10px] text-amber-700 uppercase font-black tracking-widest mb-1.5">
                    💡 Conseil
                  </p>
                  <p className="text-xs text-amber-900 leading-relaxed">
                    Le montant de l'acompte ne peut pas dépasser le solde dû.
                    Utilisez un des boutons rapides <b>30% / 50% / 100%</b> pour un calcul automatique.
                  </p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="border-t border-slate-100 p-4 bg-slate-50/50 flex gap-2">
              {depositError.toLowerCase().includes('caisse') ? (
                <>
                  <button
                    onClick={() => setDepositError(null)}
                    className="px-5 py-3 bg-white border-2 border-slate-200 rounded-xl font-bold text-sm text-slate-700 hover:bg-slate-100 transition"
                  >
                    Fermer
                  </button>
                  <a
                    href="/dashboard/caisse/journal"
                    className="flex-1 bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 text-white py-3 rounded-xl font-black text-sm shadow-lg transition flex items-center justify-center gap-2"
                  >
                    Ouvrir la caisse
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3"/>
                    </svg>
                  </a>
                </>
              ) : (
                <button
                  onClick={() => setDepositError(null)}
                  className="flex-1 px-5 py-3 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white rounded-xl font-black text-sm shadow-lg transition"
                >
                  Modifier le montant
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal enregistrer acompte */}
      {depositModal && (
        <Modal
          open={!!depositModal}
          onClose={() => setDepositModal(null)}
          title="Enregistrer un acompte"
          subtitle={`Résa ${depositModal.reference} — ${depositModal.customer?.firstName} ${depositModal.customer?.lastName}`}
          icon={<span className="text-2xl">💰</span>}
          size="md"
          footer={
            <div className="flex gap-3">
              <Button variant="secondary" onClick={() => setDepositModal(null)}>Annuler</Button>
              <button
                type="submit"
                form="deposit-form"
                disabled={depositSaving}
                className="flex-1 bg-linear-to-r from-emerald-600 to-teal-500 text-white py-2.5 rounded-xl font-semibold hover:shadow-lg transition disabled:opacity-50"
              >
                {depositSaving ? 'Enregistrement...' : 'Enregistrer l\'acompte'}
              </button>
            </div>
          }
        >
          <form id="deposit-form" onSubmit={saveDeposit} className="space-y-4">
            <div className="bg-slate-50 rounded-xl p-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-600">Total séjour</span>
                <span className="font-bold tabular-nums">
                  {(depositModal.totalAmount || 0).toLocaleString('fr-FR')} Ar
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Déjà payé</span>
                <span className="font-bold text-emerald-600 tabular-nums">
                  {(depositModal.paidAmount || 0).toLocaleString('fr-FR')} Ar
                </span>
              </div>
              <div className="flex justify-between pt-2 border-t border-slate-200">
                <span className="font-bold text-slate-900">Solde dû</span>
                <span className="font-black text-red-600 tabular-nums text-lg">
                  {((depositModal.totalAmount || 0) - (depositModal.paidAmount || 0)).toLocaleString('fr-FR')} Ar
                </span>
              </div>
            </div>

            <FormField label="Montant de l'acompte (Ar)" required>
              <Input
                type="number"
                value={depositAmount}
                onChange={(e) => setDepositAmount(e.target.value)}
                placeholder="30000"
                required
              />
            </FormField>

            <div className="flex gap-2">
              {[30, 50, 100].map((pct) => (
                <button
                  key={pct}
                  type="button"
                  onClick={() => setDepositAmount(Math.round(depositModal.totalAmount * pct / 100).toString())}
                  className="flex-1 py-2 bg-slate-100 rounded-lg text-xs font-bold text-slate-700 hover:bg-slate-200 transition"
                >
                  {pct}%
                </button>
              ))}
            </div>

            <FormField label="Mode de paiement">
              <div className="grid grid-cols-3 gap-2">
                {[
                  { v: 'CASH', l: 'Espèces', i: '💵' },
                  { v: 'CARD', l: 'Carte', i: '💳' },
                  { v: 'MOBILE', l: 'Mobile', i: '📱' },
                ].map((m) => (
                  <button
                    key={m.v}
                    type="button"
                    onClick={() => setDepositMethod(m.v)}
                    className={`py-2.5 rounded-lg text-xs font-bold border-2 transition ${
                      depositMethod === m.v
                        ? 'bg-slate-900 text-white border-slate-900'
                        : 'bg-white text-slate-700 border-slate-200 hover:border-slate-400'
                    }`}
                  >
                    {m.i} {m.l}
                  </button>
                ))}
              </div>
            </FormField>

            <FormField label="Notes (optionnel)">
              <Input
                type="text"
                value={depositNotes}
                onChange={(e) => setDepositNotes(e.target.value)}
                placeholder="Référence virement, reçu n°…"
              />
            </FormField>
          </form>
        </Modal>
      )}

      <ConfirmDialog
        open={!!reservationToDelete}
        title="Supprimer la réservation"
        message={`Voulez-vous vraiment supprimer la réservation ${reservationToDelete?.reference} ?`}
        onClose={() => setReservationToDelete(null)}
        onConfirm={confirmDelete}
        isLoading={isDeleting}
      />
    </div>
  );
}
