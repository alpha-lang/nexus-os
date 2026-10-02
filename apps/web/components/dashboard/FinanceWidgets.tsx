'use client';

export default function FinanceWidgets({ data }: { data: any }) {
  if (!data) return null;
  const { today, invoices, credits } = data;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <span className="text-lg">💰</span>
        <h2 className="text-sm font-black text-slate-900 uppercase tracking-wider">Encaissements — Finance</h2>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        {/* Détail encaissements du jour */}
        <div className="bg-gradient-to-br from-emerald-600 to-teal-600 rounded-xl p-4 text-white">
          <p className="text-[9px] text-emerald-100 uppercase font-black tracking-widest mb-2">Encaissé aujourd'hui</p>
          <p className="text-2xl font-black tabular-nums mb-3">
            {(today.total || 0).toLocaleString('fr-FR')}
            <span className="text-xs text-emerald-100 ml-1">Ar</span>
          </p>
          <div className="space-y-1.5 pt-3 border-t border-white/20">
            <div className="flex justify-between text-xs">
              <span className="text-emerald-100">💵 Espèces</span>
              <span className="font-bold tabular-nums">{today.cash.toLocaleString('fr-FR')}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-emerald-100">💳 Carte</span>
              <span className="font-bold tabular-nums">{today.card.toLocaleString('fr-FR')}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-emerald-100">📱 Mobile</span>
              <span className="font-bold tabular-nums">{today.mobile.toLocaleString('fr-FR')}</span>
            </div>
          </div>
        </div>

        {/* Factures en attente */}
        <div className={`rounded-xl p-4 border-2 ${invoices.pending > 0 ? 'bg-amber-50 border-amber-300' : 'bg-white border-slate-200'}`}>
          <p className={`text-[9px] uppercase font-black tracking-widest mb-1 ${invoices.pending > 0 ? 'text-amber-700' : 'text-slate-500'}`}>
            🧾 Factures en attente
          </p>
          <p className={`text-2xl font-black tabular-nums ${invoices.pending > 0 ? 'text-amber-700' : 'text-slate-900'}`}>
            {invoices.pending}
          </p>
          <p className={`text-[10px] mt-1 ${invoices.pending > 0 ? 'text-amber-600' : 'text-slate-400'}`}>
            {(invoices.pendingAmount || 0).toLocaleString('fr-FR')} Ar à encaisser
          </p>
        </div>

        {/* Crédits */}
        <div className={`rounded-xl p-4 border-2 ${credits.owed > 0 ? 'bg-red-50 border-red-300' : 'bg-white border-slate-200'}`}>
          <p className={`text-[9px] uppercase font-black tracking-widest mb-1 ${credits.owed > 0 ? 'text-red-700' : 'text-slate-500'}`}>
            📋 Crédits en cours
          </p>
          <p className={`text-2xl font-black tabular-nums ${credits.owed > 0 ? 'text-red-700' : 'text-slate-900'}`}>
            {(credits.owed || 0).toLocaleString('fr-FR')}
            <span className="text-xs ml-1">Ar</span>
          </p>
          <p className={`text-[10px] mt-1 ${credits.owed > 0 ? 'text-red-600' : 'text-slate-400'}`}>
            {credits.count} crédit{credits.count > 1 ? 's' : ''} en attente
          </p>
        </div>
      </div>
    </div>
  );
}
