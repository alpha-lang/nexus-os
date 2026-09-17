const fs = require('fs');
const p = 'app/dashboard/page.tsx';
let s = fs.readFileSync(p, 'utf8');

// Le widget : 1 seule ligne avec 3 mini-KPI cliquables
const widget = `      {isHotel && stockDash && (
        <div className="bg-white rounded-2xl border border-slate-200 p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg bg-teal-500 text-white flex items-center justify-center">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/>
                </svg>
              </div>
              <h3 className="font-black text-slate-900 text-sm uppercase tracking-wider">Stock</h3>
            </div>
            <a href="/dashboard/stock" className="text-[10px] font-black text-teal-600 hover:underline tracking-wider">
              VOIR TOUT
            </a>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <a href="/dashboard/stock" className="rounded-xl p-3 bg-slate-50 hover:bg-slate-100 transition border border-slate-200">
              <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest mb-1">Valorisation</p>
              <p className="text-lg font-black text-slate-900 tabular-nums leading-tight">
                {Math.round(stockDash.summary?.totalValue || 0).toLocaleString('fr-FR')}
                <span className="text-xs text-slate-500 ml-1">Ar</span>
              </p>
              <p className="text-[10px] text-slate-400 mt-0.5">{stockDash.summary?.totalItems || 0} articles</p>
            </a>

            <a
              href="/dashboard/stock?alert=1"
              className={'rounded-xl p-3 transition border ' + (
                (stockDash.alerts?.outOfStock?.length || 0) > 0
                  ? 'bg-red-50 border-red-200 hover:bg-red-100'
                  : (stockDash.alerts?.critical?.length || 0) > 0
                  ? 'bg-amber-50 border-amber-200 hover:bg-amber-100'
                  : 'bg-emerald-50 border-emerald-200 hover:bg-emerald-100'
              )}
            >
              <p className={'text-[10px] uppercase font-black tracking-widest mb-1 ' + (
                (stockDash.alerts?.outOfStock?.length || 0) > 0 ? 'text-red-700' :
                (stockDash.alerts?.critical?.length || 0) > 0 ? 'text-amber-700' :
                'text-emerald-700'
              )}>
                {((stockDash.alerts?.outOfStock?.length || 0) + (stockDash.alerts?.critical?.length || 0)) > 0 ? 'Alertes' : 'Stock OK'}
              </p>
              <p className={'text-lg font-black tabular-nums leading-tight ' + (
                (stockDash.alerts?.outOfStock?.length || 0) > 0 ? 'text-red-700' :
                (stockDash.alerts?.critical?.length || 0) > 0 ? 'text-amber-700' :
                'text-emerald-700'
              )}>
                {(stockDash.alerts?.outOfStock?.length || 0) + (stockDash.alerts?.critical?.length || 0)}
              </p>
              <p className={'text-[10px] mt-0.5 ' + (
                (stockDash.alerts?.outOfStock?.length || 0) > 0 ? 'text-red-600' :
                (stockDash.alerts?.critical?.length || 0) > 0 ? 'text-amber-600' :
                'text-emerald-600'
              )}>
                {(stockDash.alerts?.outOfStock?.length || 0) > 0 ? (stockDash.alerts.outOfStock.length + ' rupture' + (stockDash.alerts.outOfStock.length > 1 ? 's' : '')) : ((stockDash.alerts?.critical?.length || 0) > 0 ? (stockDash.alerts.critical.length + ' critique' + (stockDash.alerts.critical.length > 1 ? 's' : '')) : 'aucun problème')}
              </p>
            </a>

            <a href="/dashboard/stock/movements" className="rounded-xl p-3 bg-slate-50 hover:bg-slate-100 transition border border-slate-200">
              <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest mb-1">Mvts 30j</p>
              <p className="text-lg font-black text-slate-900 tabular-nums leading-tight">{stockDash.summary?.movements30d || 0}</p>
              <p className="text-[10px] text-slate-400 mt-0.5">
                {(stockDash.summary?.incoming30d || 0) > 0 ? '+' + Math.round(stockDash.summary.incoming30d).toLocaleString('fr-FR') + ' Ar' : 'aucune entree'}
              </p>
            </a>
          </div>
        </div>
      )}

`;

// Insérer juste avant {/* ═══ COMMERCE ═══ */}
const anchor = '      {/* ═══ COMMERCE ═══ */}';
const idx = s.indexOf(anchor);

if (idx === -1) { console.error('❌ anchor COMMERCE introuvable'); process.exit(1); }

s = s.slice(0, idx) + widget + s.slice(idx);

fs.writeFileSync(p, s);
console.log('✅ Widget compact Stock insere');
