'use client';

export default function ManagerWidgets({ data }: { data: any }) {
  if (!data) return null;
  const { revenue, paymentsToday, cashTotal, occupancy, stock } = data;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <span className="text-lg">📊</span>
        <h2 className="text-sm font-black text-slate-900 uppercase tracking-wider">Pilotage — Manager</h2>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
        <div className="bg-slate-900 rounded-lg p-4 text-white col-span-2 lg:col-span-1">
          <p className="text-[9px] text-slate-400 uppercase font-black tracking-widest mb-1">CA du mois</p>
          <p className="text-xl font-black tabular-nums text-teal-400">
            {(revenue.current || 0).toLocaleString('fr-FR')}
            <span className="text-[10px] text-slate-400 ml-1">Ar</span>
          </p>
          {revenue.growth !== 0 && (
            <p className={`text-[10px] mt-1 font-bold ${revenue.growth > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              {revenue.growth > 0 ? '↑' : '↓'} {Math.abs(revenue.growth)}% vs mois dernier
            </p>
          )}
        </div>

        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <p className="text-[9px] text-slate-500 uppercase font-black tracking-widest mb-1">Encaissé aujourd'hui</p>
          <p className="text-xl font-black text-slate-900 tabular-nums">
            {(paymentsToday || 0).toLocaleString('fr-FR')}
            <span className="text-[10px] text-slate-400 ml-1">Ar</span>
          </p>
        </div>

        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <p className="text-[9px] text-slate-500 uppercase font-black tracking-widest mb-1">Solde caisse total</p>
          <p className="text-xl font-black text-slate-900 tabular-nums">
            {(cashTotal || 0).toLocaleString('fr-FR')}
            <span className="text-[10px] text-slate-400 ml-1">Ar</span>
          </p>
        </div>

        {occupancy ? (
          <div className="bg-white rounded-lg border border-slate-200 p-4">
            <p className="text-[9px] text-slate-500 uppercase font-black tracking-widest mb-1">Occupation</p>
            <p className="text-xl font-black text-slate-900 tabular-nums">{occupancy.rate}%</p>
            <p className="text-[10px] text-slate-400">{occupancy.occupied} / {occupancy.total} chambres</p>
          </div>
        ) : (
          <div className="bg-white rounded-lg border border-slate-200 p-4">
            <p className="text-[9px] text-slate-500 uppercase font-black tracking-widest mb-1">Stock critique</p>
            <p className="text-xl font-black text-red-600 tabular-nums">{stock.criticalCount}</p>
            <p className="text-[10px] text-slate-400">articles en rupture</p>
          </div>
        )}
      </div>
    </div>
  );
}
