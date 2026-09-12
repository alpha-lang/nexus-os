'use client';

import { useState, useEffect } from 'react';
import { Modal, Button, Badge, PageHeader } from '../../../../components/ui';

const STATUS_META: Record<string, { label: string; variant: any; icon: string }> = {
  PENDING: { label: 'En attente', variant: 'warning', icon: '⏳' },
  CONFIRMED: { label: 'Confirmée', variant: 'info', icon: '✅' },
  CHECKED_IN: { label: 'Check-in', variant: 'success', icon: '🛎️' },
  CHECKED_OUT: { label: 'Check-out', variant: 'neutral', icon: '👋' },
  CANCELLED: { label: 'Annulée', variant: 'danger', icon: '❌' },
  NO_SHOW: { label: 'No-show', variant: 'warning', icon: '🚫' },
};

type Tab = 'arrivals' | 'departures' | 'inhouse';

export default function CheckinPage() {
  const [tab, setTab] = useState<Tab>('arrivals');
  const [search, setSearch] = useState('');
  const [toast, setToast] = useState<string | null>(null);
  const [arrivals, setArrivals] = useState<any[]>([]);
  const [departures, setDepartures] = useState<any[]>([]);
  const [inhouse, setInhouse] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [selected, setSelected] = useState<any>(null);

  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : '';

  async function load() {
    const [todayRes, allRes] = await Promise.all([
      fetch('/api/hotel/today', { headers: { Authorization: `Bearer ${token}` } }),
      fetch('/api/hotel/reservations', { headers: { Authorization: `Bearer ${token}` } }),
    ]);
    const [today, all] = await Promise.all([todayRes.json(), allRes.json()]);
    setArrivals(Array.isArray(today.arrivals) ? today.arrivals : []);
    setDepartures(Array.isArray(today.departures) ? today.departures : []);
    if (Array.isArray(all)) {
      setInhouse(all.filter((r: any) => r.status === 'CHECKED_IN'));
    }
  }

  useEffect(() => {
    load().catch(console.error).finally(() => setLoading(false));
    // Rafraîchir toutes les 60 secondes
    const interval = setInterval(() => load().catch(console.error), 60000);
    return () => clearInterval(interval);
  }, []);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  }

  async function doCheckIn(r: any) {
    setActionLoading(r.id);
    await fetch(`/api/hotel/reservations/${r.id}/check-in`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}` },
    });
    await load();
    setActionLoading(null);
    setSelected(null);
    showToast(`Check-in OK : ${r.customer?.firstName || ''} ${r.customer?.lastName || ''} - Ch. ${r.room?.number}`);
  }

  async function doCheckOut(r: any) {
    setActionLoading(r.id);
    await fetch(`/api/hotel/reservations/${r.id}/check-out`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}` },
    });
    await load();
    setActionLoading(null);
    setSelected(null);
    showToast(`Check-out OK : Ch. ${r.room?.number} liberee`);
  }

  function nights(r: any) {
    const i = new Date(r.checkInDate), o = new Date(r.checkOutDate);
    return Math.max(1, Math.ceil((o.getTime() - i.getTime()) / (1000 * 60 * 60 * 24)));
  }

  function timeAgo(date: string, now: number = new Date().getTime()) {
    const diff = now - new Date(date).getTime();
    const min = Math.floor(diff / 60000);
    if (min < 1) return 'à l\'instant';
    if (min < 60) return `il y a ${min} min`;
    const h = Math.floor(min / 60);
    if (h < 24) return `il y a ${h}h`;
    return `il y a ${Math.floor(h / 24)}j`;
  }

  if (loading) return <div className="flex justify-center items-center h-64">Chargement...</div>;

  const baseList = tab === 'arrivals' ? arrivals : tab === 'departures' ? departures : inhouse;
  const currentList = search.trim()
    ? baseList.filter((r: any) => {
        const q = search.toLowerCase();
        const name = `${r.customer?.firstName || ''} ${r.customer?.lastName || ''}`.toLowerCase();
        const ref = (r.reference || '').toLowerCase();
        const room = (r.room?.number || '').toLowerCase();
        return name.includes(q) || ref.includes(q) || room.includes(q);
      })
    : baseList;

  const totalDue = currentList.reduce((sum: number, r: any) => sum + Math.max(0, (r.totalAmount || 0) - (r.paidAmount || 0)), 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Check-in / Check-out"
        subtitle={new Date().toLocaleDateString('fr-FR', {
          weekday: 'long',
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        })}
      />

      {toast && (
        <div className="fixed top-20 right-4 z-[100] bg-slate-900 text-white px-4 py-3 rounded-xl shadow-2xl text-sm font-medium">
          {toast}
        </div>
      )}

      {/* Recherche + total reste du */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-3">
        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
          <div className="relative flex-1">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
              </svg>
            </span>
            <input
              type="text"
              placeholder="Rechercher par nom, reference, chambre..."
              value={search}
              onChange={e => setSearch(e.target.value)}
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
          <div className="flex items-center gap-4 shrink-0">
            <div className="text-right">
              <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest">A traiter</p>
              <p className="text-lg font-black text-slate-900 tabular-nums">{currentList.length}</p>
            </div>
            {totalDue > 0 && (
              <div className="text-right pl-4 border-l border-slate-200">
                <p className="text-[10px] text-red-600 uppercase font-black tracking-widest">Reste a encaisser</p>
                <p className="text-lg font-black text-red-600 tabular-nums">{totalDue.toLocaleString('fr-FR')} Ar</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* KPIs du jour */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <button
          onClick={() => setTab('arrivals')}
          className={`text-left bg-white rounded-2xl p-5 shadow-sm border-2 transition ${
            tab === 'arrivals' ? 'border-teal-400 shadow-teal-100' : 'border-gray-200 hover:border-teal-200'
          }`}
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="w-11 h-11 bg-teal-100 rounded-xl flex items-center justify-center text-xl">🛬</div>
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase">Arrivées du jour</p>
              <p className="text-3xl font-bold text-slate-900">{arrivals.length}</p>
            </div>
          </div>
          <p className="text-xs text-slate-500">Clients à enregistrer aujourd'hui</p>
        </button>

        <button
          onClick={() => setTab('departures')}
          className={`text-left bg-white rounded-2xl p-5 shadow-sm border-2 transition ${
            tab === 'departures' ? 'border-blue-400 shadow-blue-100' : 'border-gray-200 hover:border-blue-200'
          }`}
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="w-11 h-11 bg-blue-100 rounded-xl flex items-center justify-center text-xl">🛫</div>
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase">Départs du jour</p>
              <p className="text-3xl font-bold text-slate-900">{departures.length}</p>
            </div>
          </div>
          <p className="text-xs text-slate-500">Clients à libérer aujourd'hui</p>
        </button>

        <button
          onClick={() => setTab('inhouse')}
          className={`text-left bg-white rounded-2xl p-5 shadow-sm border-2 transition ${
            tab === 'inhouse' ? 'border-purple-400 shadow-purple-100' : 'border-gray-200 hover:border-purple-200'
          }`}
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="w-11 h-11 bg-purple-100 rounded-xl flex items-center justify-center text-xl">🏨</div>
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase">Clients en séjour</p>
              <p className="text-3xl font-bold text-slate-900">{inhouse.length}</p>
            </div>
          </div>
          <p className="text-xs text-slate-500">Actuellement dans l'hôtel</p>
        </button>
      </div>

      {/* Liste */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="font-semibold text-slate-900">
            {tab === 'arrivals' && '🛬 Arrivées à traiter'}
            {tab === 'departures' && '🛫 Départs à traiter'}
            {tab === 'inhouse' && '🏨 Clients en séjour'}
          </h3>
          <span className="text-xs text-slate-400">Actualisation auto toutes les 60s</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 border-b border-gray-200">
              <tr>
                <th className="p-4 font-semibold text-slate-600">Référence</th>
                <th className="p-4 font-semibold text-slate-600">Client</th>
                <th className="p-4 font-semibold text-slate-600">Chambre</th>
                <th className="p-4 font-semibold text-slate-600">Séjour</th>
                <th className="p-4 font-semibold text-slate-600 text-center">Nuits</th>
                <th className="p-4 font-semibold text-slate-600">Statut</th>
                <th className="p-4 font-semibold text-slate-600 text-right">Reste</th>
                <th className="p-4 font-semibold text-slate-600 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {currentList.map((r) => {
                const meta = STATUS_META[r.status] || STATUS_META.PENDING;
                const reste = (r.totalAmount || 0) - (r.paidAmount || 0);
                const isProcessing = actionLoading === r.id;

                return (
                  <tr key={r.id} className="hover:bg-teal-50/40 transition">
                    <td className="p-4 font-mono text-xs font-semibold text-slate-700">{r.reference}</td>
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 bg-linear-to-br from-blue-500 to-teal-500 rounded-full flex items-center justify-center text-white font-bold text-xs shrink-0">
                          {r.customer?.firstName?.charAt(0)}{r.customer?.lastName?.charAt(0)}
                        </div>
                        <div>
                          <div className="font-medium text-slate-900">
                            {r.customer?.firstName} {r.customer?.lastName}
                          </div>
                          <div className="text-xs text-slate-500">{r.customer?.phone || '—'}</div>
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="font-bold text-slate-900 text-lg">N° {r.room?.number}</div>
                      <div className="text-xs text-slate-500">{r.room?.roomType?.name}</div>
                    </td>
                    <td className="p-4 text-slate-600 text-xs">
                      <div>🛬 {new Date(r.checkInDate).toLocaleDateString('fr-FR')}</div>
                      <div>🛫 {new Date(r.checkOutDate).toLocaleDateString('fr-FR')}</div>
                    </td>
                    <td className="p-4 text-center font-semibold text-slate-700">{nights(r)}</td>
                    <td className="p-4">
                      <Badge variant={meta.variant}>{meta.icon} {meta.label}</Badge>
                    </td>
                    <td className={`p-4 text-right font-semibold ${reste > 0 ? 'text-red-600' : 'text-green-600'}`}>
                      {reste.toLocaleString('fr-FR')} Ar
                    </td>
                    <td className="p-4 text-center">
                      {tab === 'arrivals' && (
                        <Button
                          size="sm"
                          onClick={() => doCheckIn(r)}
                          loading={isProcessing}
                          icon={!isProcessing && <span>🛎️</span>}
                        >
                          Check-in
                        </Button>
                      )}
                      {tab === 'departures' && (
                        <Button
                          size="sm"
                          variant="primary"
                          onClick={() => doCheckOut(r)}
                          loading={isProcessing}
                          icon={!isProcessing && <span>👋</span>}
                        >
                          Check-out
                        </Button>
                      )}
                      {tab === 'inhouse' && (
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => setSelected(r)}
                        >
                          Voir
                        </Button>
                      )}
                    </td>
                  </tr>
                );
              })}
              {currentList.length === 0 && (
                <tr>
                  <td colSpan={8} className="p-12 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center text-3xl">
                        {tab === 'arrivals' && '🛬'}
                        {tab === 'departures' && '🛫'}
                        {tab === 'inhouse' && '🏨'}
                      </div>
                      <p className="text-slate-400 font-medium">
                        {tab === 'arrivals' && 'Aucune arrivée prévue aujourd\'hui'}
                        {tab === 'departures' && 'Aucun départ prévu aujourd\'hui'}
                        {tab === 'inhouse' && 'Aucun client en séjour actuellement'}
                      </p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal détail (client en séjour) */}
      <Modal
        open={!!selected}
        onClose={() => setSelected(null)}
        title={selected?.customer ? `${selected.customer.firstName} ${selected.customer.lastName}` : 'Détail séjour'}
        subtitle={selected?.reference}
        icon={<span className="text-2xl">🏨</span>}
        size="md"
        footer={
          <div className="flex gap-3">
            <Button variant="secondary" onClick={() => setSelected(null)}>Fermer</Button>
            {selected && (
              <Button
                onClick={() => doCheckOut(selected)}
                loading={actionLoading === selected?.id}
                icon={<span>👋</span>}
              >
                Faire le check-out
              </Button>
            )}
          </div>
        }
      >
        {selected && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-slate-50 rounded-xl p-3">
                <p className="text-xs text-slate-500 uppercase font-semibold mb-1">Chambre</p>
                <p className="text-lg font-bold text-slate-900">N° {selected.room?.number}</p>
                <p className="text-xs text-slate-500">{selected.room?.roomType?.name}</p>
              </div>
              <div className="bg-slate-50 rounded-xl p-3">
                <p className="text-xs text-slate-500 uppercase font-semibold mb-1">Statut</p>
                <Badge variant={STATUS_META[selected.status]?.variant}>
                  {STATUS_META[selected.status]?.icon} {STATUS_META[selected.status]?.label}
                </Badge>
              </div>
            </div>

            <div className="bg-slate-50 rounded-xl p-4">
              <p className="text-xs text-slate-500 uppercase font-semibold mb-2">Séjour</p>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-600">Arrivée</span>
                  <span className="font-medium">{new Date(selected.checkInDate).toLocaleDateString('fr-FR')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Départ</span>
                  <span className="font-medium">{new Date(selected.checkOutDate).toLocaleDateString('fr-FR')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Nuits</span>
                  <span className="font-medium">{nights(selected)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Personnes</span>
                  <span className="font-medium">
                    {selected.adults} adulte{selected.adults > 1 ? 's' : ''}
                    {selected.children > 0 && ` + ${selected.children} enfant${selected.children > 1 ? 's' : ''}`}
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-linear-to-r from-blue-50 to-teal-50 rounded-xl p-4 border border-teal-100">
              <p className="text-xs text-slate-500 uppercase font-semibold mb-2">Paiement</p>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-600">Total</span>
                  <span className="font-semibold">{selected.totalAmount.toLocaleString('fr-FR')} Ar</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Payé</span>
                  <span className="font-semibold text-green-600">{selected.paidAmount.toLocaleString('fr-FR')} Ar</span>
                </div>
                <div className="flex justify-between pt-2 border-t border-teal-200">
                  <span className="text-slate-700 font-semibold">Reste dû</span>
                  <span className={`font-bold text-lg ${(selected.totalAmount - selected.paidAmount) > 0 ? 'text-red-600' : 'text-green-600'}`}>
                    {(selected.totalAmount - selected.paidAmount).toLocaleString('fr-FR')} Ar
                  </span>
                </div>
              </div>
            </div>

            {selected.checkedInAt && (
              <p className="text-xs text-slate-400 text-center">
                Check-in effectué {timeAgo(selected.checkedInAt)}
              </p>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
