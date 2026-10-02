'use client';

import { useRouter } from 'next/navigation';

function KpiCard({ label, value, sub, accent, href }: any) {
  const accents = {
    teal:   { bg: 'bg-teal-50',   text: 'text-teal-700',   border: 'border-teal-200',   dot: 'bg-teal-500' },
    blue:   { bg: 'bg-blue-50',   text: 'text-blue-700',   border: 'border-blue-200',   dot: 'bg-blue-500' },
    purple: { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200', dot: 'bg-purple-500' },
    amber:  { bg: 'bg-amber-50',  text: 'text-amber-700',  border: 'border-amber-200',  dot: 'bg-amber-500' },
    red:    { bg: 'bg-red-50',    text: 'text-red-700',    border: 'border-red-200',    dot: 'bg-red-500' },
    green:  { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', dot: 'bg-emerald-500' },
  };
  const a = (accents as any)[accent] || accents.teal;
  const router = useRouter();

  return (
    <button
      onClick={() => href && router.push(href)}
      className={`text-left bg-white rounded-lg border ${a.border} p-3 hover:shadow-md transition group`}
    >
      <div className="flex items-start justify-between mb-2">
        <div className={`w-7 h-7 rounded-lg ${a.bg} flex items-center justify-center`}>
          <span className={`w-2 h-2 rounded-full ${a.dot}`} />
        </div>
        {href && (
          <svg className="w-4 h-4 text-slate-300 group-hover:text-slate-500 transition" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 8l4 4m0 0l-4 4m4-4H3" />
          </svg>
        )}
      </div>
      <p className="text-[9px] text-slate-500 uppercase font-black tracking-widest mb-0.5">{label}</p>
      <p className={`text-xl font-black tabular-nums leading-none ${a.text}`}>{value}</p>
      {sub && <p className="text-[10px] text-slate-400 mt-1">{sub}</p>}
    </button>
  );
}

export default function ReceptionWidgets({ data }: { data: any }) {
  if (!data) return null;
  const { arrivals, departures, inHouse, pendingResas, rooms, recentFolios } = data;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <span className="text-lg">🛎️</span>
        <h2 className="text-sm font-black text-slate-900 uppercase tracking-wider">Aujourd'hui — Réception</h2>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
        <KpiCard label="Arrivées" value={arrivals} sub="à enregistrer aujourd'hui" accent="teal" href="/dashboard/reservations/checkin" />
        <KpiCard label="Départs" value={departures} sub="à libérer aujourd'hui" accent="blue" href="/dashboard/reservations/checkin" />
        <KpiCard label="En séjour" value={inHouse} sub="clients actuellement" accent="purple" href="/dashboard/reservations" />
        <KpiCard label="En attente" value={pendingResas} sub="à confirmer" accent="amber" href="/dashboard/reservations" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-2.5">
        {/* Chambres */}
        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest mb-3">🏨 État des chambres</p>
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <span className="text-xs font-medium text-slate-700">Disponibles</span>
              </div>
              <span className="text-lg font-black text-slate-900 tabular-nums">{rooms.available}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-red-500" />
                <span className="text-xs font-medium text-slate-700">Occupées</span>
              </div>
              <span className="text-lg font-black text-slate-900 tabular-nums">{rooms.occupied}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-amber-500" />
                <span className="text-xs font-medium text-slate-700">En ménage</span>
              </div>
              <span className="text-lg font-black text-slate-900 tabular-nums">{rooms.cleaning}</span>
            </div>
          </div>
        </div>

        {/* Folios récents */}
        <div className="lg:col-span-2 bg-white rounded-lg border border-slate-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
            <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest">📋 Séjours récents</p>
            <a href="/dashboard/reservations" className="text-[10px] font-black text-teal-600 hover:underline">VOIR TOUT →</a>
          </div>
          <div className="divide-y divide-slate-100">
            {recentFolios.length === 0 ? (
              <p className="p-6 text-center text-xs text-slate-400">Aucun séjour récent</p>
            ) : (
              recentFolios.map((r: any) => (
                <div key={r.id} className="flex items-center gap-2.5 px-4 py-2.5">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-teal-500 flex items-center justify-center text-white text-xs font-black shrink-0">
                    {(r.customer?.firstName || '?').charAt(0)}{(r.customer?.lastName || '?').charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-slate-900 truncate">
                      {r.customer?.firstName} {r.customer?.lastName}
                    </p>
                    <p className="text-[10px] text-slate-500">Ch. {r.room?.number} · {r.reference}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs font-black text-slate-900 tabular-nums">{r.totalAmount?.toLocaleString('fr-FR')} Ar</p>
                    <p className={`text-[9px] font-black ${r.status === 'CHECKED_IN' ? 'text-emerald-600' : 'text-slate-400'}`}>{r.status}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
