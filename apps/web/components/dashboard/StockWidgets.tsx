'use client';

export default function StockWidgets({ data }: { data: any }) {
  if (!data) return null;
  const { totalItems, totalValue, critical, out, pendingOrders, movements30d, suppliers } = data;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <span className="text-lg">📦</span>
        <h2 className="text-sm font-black text-slate-900 uppercase tracking-wider">Inventaire — Stock Manager</h2>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
        <div className="bg-slate-900 rounded-lg p-4 text-white">
          <p className="text-[9px] text-slate-400 uppercase font-black tracking-widest mb-1">Valorisation</p>
          <p className="text-xl font-black tabular-nums text-teal-400">
            {Math.round(totalValue || 0).toLocaleString('fr-FR')}
            <span className="text-[10px] text-slate-400 ml-1">Ar</span>
          </p>
          <p className="text-[10px] text-slate-500 mt-1">{totalItems} article{totalItems > 1 ? 's' : ''}</p>
        </div>

        <div className={`rounded-lg p-4 border-2 ${out > 0 ? 'bg-red-50 border-red-300' : 'bg-white border-slate-200'}`}>
          <p className={`text-[9px] uppercase font-black tracking-widest mb-1 ${out > 0 ? 'text-red-700' : 'text-slate-500'}`}>
            🚨 Ruptures
          </p>
          <p className={`text-2xl font-black tabular-nums ${out > 0 ? 'text-red-700' : 'text-slate-900'}`}>{out}</p>
        </div>

        <div className={`rounded-lg p-4 border-2 ${critical > 0 ? 'bg-amber-50 border-amber-300' : 'bg-white border-slate-200'}`}>
          <p className={`text-[9px] uppercase font-black tracking-widest mb-1 ${critical > 0 ? 'text-amber-700' : 'text-slate-500'}`}>
            ⚠️ Critiques
          </p>
          <p className={`text-2xl font-black tabular-nums ${critical > 0 ? 'text-amber-700' : 'text-slate-900'}`}>{critical}</p>
        </div>

        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <p className="text-[9px] text-slate-500 uppercase font-black tracking-widest mb-1">📋 Commandes</p>
          <p className="text-2xl font-black text-slate-900 tabular-nums">{pendingOrders}</p>
          <p className="text-[10px] text-slate-400">en cours</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="bg-white rounded-lg border border-slate-200 p-3 flex items-center gap-2.5">
          <span className="text-2xl">🔄</span>
          <div>
            <p className="text-[9px] text-slate-500 uppercase font-black tracking-widest">Mouvements 30j</p>
            <p className="text-lg font-black text-slate-900 tabular-nums">{movements30d}</p>
          </div>
        </div>
        <div className="bg-white rounded-lg border border-slate-200 p-3 flex items-center gap-2.5">
          <span className="text-2xl">🚚</span>
          <div>
            <p className="text-[9px] text-slate-500 uppercase font-black tracking-widest">Fournisseurs</p>
            <p className="text-lg font-black text-slate-900 tabular-nums">{suppliers}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
