'use client';

import { useState, useEffect, useMemo } from 'react';
import { apiFetch } from '../../../../lib/api';
import { Button, Badge } from '../../../../components/ui';

const STATUS_COLORS: Record<string, string> = {
  PENDING: 'bg-yellow-400 hover:bg-yellow-500',
  CONFIRMED: 'bg-blue-500 hover:bg-blue-600',
  CHECKED_IN: 'bg-green-500 hover:bg-green-600',
  CHECKED_OUT: 'bg-slate-400 hover:bg-slate-500',
};

function addDays(d: Date, n: number) {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

function startOfDay(d: Date) {
  const r = new Date(d);
  r.setHours(0, 0, 0, 0);
  return r;
}

export default function PlanningPage() {
  const [rooms, setRooms] = useState<any[]>([]);
  const [reservations, setReservations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [weekStart, setWeekStart] = useState(() => startOfDay(new Date()));
  const [daysToShow, setDaysToShow] = useState(14);
  const [selectedResa, setSelectedResa] = useState<any>(null);
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : '';

  const days = useMemo(() => {
    const arr: Date[] = [];
    for (let i = 0; i < daysToShow; i++) arr.push(addDays(weekStart, i));
    return arr;
  }, [weekStart, daysToShow]);

  async function load() {
    const from = weekStart.toISOString();
    const to = addDays(weekStart, daysToShow).toISOString();
    const res = await apiFetch(`/api/hotel/planning?from=${from}&to=${to}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    setRooms(Array.isArray(data.rooms) ? data.rooms : []);
    setReservations(Array.isArray(data.reservations) ? data.reservations : []);
  }

  useEffect(() => {
    setLoading(true);
    load().catch(console.error).finally(() => setLoading(false));
  }, [weekStart, daysToShow]);

  function prevWeek() { setWeekStart(addDays(weekStart, -7)); }
  function nextWeek() { setWeekStart(addDays(weekStart, 7)); }
  function today() { setWeekStart(startOfDay(new Date())); }

  if (loading) return <div className="flex justify-center items-center h-64">Chargement...</div>;

  // Helper : jours occupés d'une résa
  function resaSpan(resa: any) {
    const ci = startOfDay(new Date(resa.checkInDate));
    const co = startOfDay(new Date(resa.checkOutDate));
    const startIdx = days.findIndex((d) => d.getTime() === ci.getTime());
    const endIdxRaw = days.findIndex((d) => d.getTime() === co.getTime());
    const endIdx = endIdxRaw === -1 ? days.length : endIdxRaw;
    return { startIdx, endIdx };
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Planning</h1>
          <p className="text-slate-500 mt-1 text-sm">
            Vue calendrier des reservations par chambre
            {reservations.length > 0 && rooms.length > 0 && (
              <span className="ml-2 inline-flex items-center gap-1 text-xs font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
                {reservations.length} resa · {Math.round((reservations.reduce((s, r) => {
                  const nights = Math.max(1, Math.ceil((new Date(r.checkOutDate).getTime() - new Date(r.checkInDate).getTime()) / 86400000));
                  return s + nights;
                }, 0)) / (rooms.length * daysToShow) * 100)}% occupation
              </span>
            )}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button variant="secondary" size="sm" onClick={prevWeek}>← Semaine</Button>
          <Button variant="secondary" size="sm" onClick={today}>Aujourd'hui</Button>
          <Button variant="secondary" size="sm" onClick={nextWeek}>Semaine →</Button>
          <select
            value={daysToShow}
            onChange={(e) => setDaysToShow(parseInt(e.target.value))}
            className="px-3 py-2 bg-slate-100 rounded-xl text-xs font-semibold"
          >
            <option value={7}>7 jours</option>
            <option value={14}>14 jours</option>
            <option value={21}>21 jours</option>
            <option value={30}>30 jours</option>
          </select>
        </div>
      </div>

      {/* Légende */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 px-4 py-3 flex flex-wrap items-center gap-4">
        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Legende</span>
        <span className="flex items-center gap-2 text-xs font-bold text-slate-800">
          <span className="w-3 h-3 rounded bg-yellow-400 shrink-0"></span> En attente
        </span>
        <span className="flex items-center gap-2 text-xs font-bold text-slate-800">
          <span className="w-3 h-3 rounded bg-blue-500 shrink-0"></span> Confirmee
        </span>
        <span className="flex items-center gap-2 text-xs font-bold text-slate-800">
          <span className="w-3 h-3 rounded bg-green-500 shrink-0"></span> En sejour
        </span>
        <span className="flex items-center gap-2 text-xs font-bold text-slate-800">
          <span className="w-3 h-3 rounded bg-slate-400 shrink-0"></span> Terminee
        </span>
        <span className="ml-auto flex items-center gap-2 text-xs font-bold text-slate-800">
          <span className="w-3 h-3 rounded bg-teal-500 shrink-0 ring-2 ring-teal-200"></span> Aujourd hui
        </span>
      </div>

      {/* Planning grid */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <div style={{ minWidth: `${180 + days.length * 60}px` }}>
            {/* Header jours */}
            <div
              className="grid border-b-2 border-slate-200 bg-slate-50 sticky top-0 z-10"
              style={{ gridTemplateColumns: `180px repeat(${days.length}, 60px)` }}
            >
              <div className="p-3 font-semibold text-slate-700 text-sm border-r border-slate-200">
                Chambre
              </div>
              {days.map((d, i) => {
                const isToday = d.toDateString() === new Date().toDateString();
                const isWeekend = d.getDay() === 0 || d.getDay() === 6;
                return (
                  <div
                    key={i}
                    className={`p-2 text-center border-r border-slate-200 ${
                      isToday ? 'bg-teal-100' : isWeekend ? 'bg-slate-100' : ''
                    }`}
                  >
                    <div className="text-xs text-slate-500 capitalize">
                      {d.toLocaleDateString('fr-FR', { weekday: 'short' })}
                    </div>
                    <div className={`text-sm font-bold ${isToday ? 'text-teal-700' : 'text-slate-900'}`}>
                      {d.getDate()}
                    </div>
                    <div className="text-[10px] text-slate-400">
                      {d.toLocaleDateString('fr-FR', { month: 'short' })}
                    </div>
                    {(() => {
                      const count = reservations.filter(r => {
                        const ci = startOfDay(new Date(r.checkInDate));
                        const co = startOfDay(new Date(r.checkOutDate));
                        return d.getTime() >= ci.getTime() && d.getTime() < co.getTime();
                      }).length;
                      const pct = rooms.length > 0 ? count / rooms.length : 0;
                      const cls = pct >= 0.95 ? 'bg-red-500 text-white'
                        : pct >= 0.75 ? 'bg-amber-400 text-slate-900'
                        : count > 0 ? 'bg-teal-500 text-white'
                        : 'bg-slate-200 text-slate-500';
                      return (
                        <div className={`mt-1 text-[10px] font-black rounded-md px-1.5 py-0.5 ${cls}`}>
                          {count}/{rooms.length}
                        </div>
                      );
                    })()}
                  </div>
                );
              })}
            </div>

            {/* Lignes chambres */}
            {rooms.map((room) => {
              const roomResas = reservations.filter((r) => r.roomId === room.id);
              return (
                <div
                  key={room.id}
                  className="grid border-b border-slate-100 hover:bg-slate-50/50 relative"
                  style={{ gridTemplateColumns: `180px repeat(${days.length}, 60px)` }}
                >
                  {/* Colonne chambre */}
                  <div className="p-3 border-r border-slate-200 flex items-center gap-2">
                    <div className="w-8 h-8 bg-linear-to-br from-blue-500 to-teal-500 rounded-lg flex items-center justify-center text-white font-bold text-xs shrink-0">
                      {room.number.slice(0, 2)}
                    </div>
                    <div className="min-w-0">
                      <div className="font-bold text-slate-900 text-sm">N° {room.number}</div>
                      <div className="text-[10px] text-slate-500 truncate">{room.roomType?.name}</div>
                    </div>
                  </div>

                  {/* Cases jours */}
                  {days.map((d, i) => {
                    const isToday = d.toDateString() === new Date().toDateString();
                    const isWeekend = d.getDay() === 0 || d.getDay() === 6;
                    // Trouver une résa qui couvre ce jour
                    const resa = roomResas.find((r) => {
                      const ci = startOfDay(new Date(r.checkInDate));
                      const co = startOfDay(new Date(r.checkOutDate));
                      return d.getTime() >= ci.getTime() && d.getTime() < co.getTime();
                    });
                    if (resa) return null; // rendu par la barre absolue

                    return (
                      <div
                        key={i}
                        className={`border-r border-slate-100 relative ${
                          isToday ? 'bg-teal-50/40' : isWeekend ? 'bg-slate-50/50' : ''
                        }`}
                        style={{ height: '64px' }}
                      >
                        {isToday && (
                          <div className="absolute left-1/2 top-0 bottom-0 w-0.5 bg-teal-500/60 -translate-x-1/2 pointer-events-none"></div>
                        )}
                      </div>
                    );
                  })}

                  {/* Barres de résa en overlay */}
                  {roomResas.map((resa) => {
                    const { startIdx, endIdx } = resaSpan(resa);
                    if (startIdx === -1 || endIdx <= 0 || startIdx >= days.length) return null;
                    const visibleStart = Math.max(0, startIdx);
                    const visibleEnd = Math.min(days.length, endIdx);
                    const width = (visibleEnd - visibleStart) * 60 - 4;
                    const left = 180 + visibleStart * 60 + 2;
                    const color = STATUS_COLORS[resa.status] || 'bg-blue-500';

                    return (
                      <button
                        key={resa.id}
                        onClick={() => setSelectedResa(resa)}
                        style={{
                          position: 'absolute',
                          left: `${left}px`,
                          top: '8px',
                          height: '48px',
                          width: `${width}px`,
                        }}
                        className={`${color} text-white rounded-lg px-3 flex items-center gap-2 shadow-sm transition z-10 text-left overflow-hidden`}
                      >
                        <span className="text-xs font-bold truncate">
                          {resa.customer?.firstName?.charAt(0)}
                          {resa.customer?.lastName?.charAt(0)}
                        </span>
                        <span className="text-xs truncate">
                          {resa.customer?.firstName} {resa.customer?.lastName?.charAt(0)}.
                        </span>
                      </button>
                    );
                  })}
                </div>
              );
            })}

            {rooms.length === 0 && (
              <div className="p-12 text-center text-slate-400">Aucune chambre</div>
            )}
          </div>
        </div>
      </div>

      {/* Modal détail résa */}
      {selectedResa && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setSelectedResa(null)}></div>
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="font-bold text-slate-900">Réservation {selectedResa.reference}</h3>
                <p className="text-sm text-slate-500 mt-1">
                  {selectedResa.customer?.firstName} {selectedResa.customer?.lastName}
                </p>
              </div>
              <button onClick={() => setSelectedResa(null)} className="text-slate-400 hover:text-slate-600">×</button>
            </div>

            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-500">Chambre</span>
                <span className="font-medium">N° {selectedResa.room?.number}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Arrivée</span>
                <span className="font-medium">{new Date(selectedResa.checkInDate).toLocaleDateString('fr-FR')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Départ</span>
                <span className="font-medium">{new Date(selectedResa.checkOutDate).toLocaleDateString('fr-FR')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Total</span>
                <span className="font-bold">{selectedResa.totalAmount.toLocaleString('fr-FR')} Ar</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Statut</span>
                <Badge variant={selectedResa.status === 'CHECKED_IN' ? 'success' : selectedResa.status === 'CONFIRMED' ? 'info' : 'warning'}>
                  {selectedResa.status}
                </Badge>
              </div>
            </div>

            <div className="mt-6 flex gap-2">
              <a
                href="/dashboard/reservations"
                className="flex-1 text-center bg-linear-to-r from-blue-600 to-teal-500 text-white py-2.5 rounded-xl font-semibold text-sm hover:shadow-lg transition"
              >
                Voir la résa
              </a>
              <button
                onClick={() => setSelectedResa(null)}
                className="px-4 py-2.5 bg-slate-100 rounded-xl text-sm font-semibold hover:bg-slate-200"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
