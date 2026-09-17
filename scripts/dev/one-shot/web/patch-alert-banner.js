const fs = require('fs');
const p = 'app/dashboard/stock/page.tsx';
let s = fs.readFileSync(p, 'utf8');

const old = `      {totalAlerts > 0 && (
        <div className="bg-red-50 border-l-4 border-red-500 rounded-2xl px-5 py-4 flex items-start gap-4">
          <div className="w-10 h-10 rounded-full bg-red-500 text-white flex items-center justify-center font-black shrink-0">
            {totalAlerts}
          </div>
          <div className="flex-1">
            <h3 className="font-black text-red-900 text-sm uppercase tracking-wider">
              {totalAlerts} article{totalAlerts > 1 ? 's' : ''} necessite{totalAlerts > 1 ? 'nt' : ''} votre attention
            </h3>
            <p className="text-xs text-red-700 mt-0.5">
              {alerts.outOfStock?.length || 0} en rupture · {alerts.critical?.length || 0} en stock critique
            </p>
          </div>
          <a
            href="/dashboard/stock/movements"
            className="px-3 py-1.5 rounded-lg bg-red-500 text-white text-xs font-bold hover:bg-red-600 transition shrink-0"
          >
            Voir mouvements
          </a>
        </div>
      )}`;

const neu = `      {totalAlerts > 0 && (() => {
        const criticalNames = [...(alerts.outOfStock || []), ...(alerts.critical || [])];
        const singleItem = criticalNames.length === 1 ? criticalNames[0] : null;
        const movementsHref = singleItem
          ? '/dashboard/stock/movements?search=' + encodeURIComponent(singleItem.name)
          : '/dashboard/stock/movements';
        return (
          <div className="bg-red-50 border-l-4 border-red-500 rounded-2xl px-5 py-4">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-full bg-red-500 text-white flex items-center justify-center font-black shrink-0">
                {totalAlerts}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-black text-red-900 text-sm uppercase tracking-wider">
                  {totalAlerts} article{totalAlerts > 1 ? 's' : ''} necessite{totalAlerts > 1 ? 'nt' : ''} votre attention
                </h3>
                {criticalNames.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {criticalNames.slice(0, 6).map((a: any) => (
                      <a
                        key={a.id}
                        href={'/dashboard/stock/movements?search=' + encodeURIComponent(a.name)}
                        className={'inline-flex items-center gap-1.5 text-[11px] font-bold px-2 py-1 rounded-md border transition hover:shadow-sm ' + (
                          (a.currentStock || 0) <= 0
                            ? 'bg-red-100 text-red-800 border-red-300 hover:bg-red-200'
                            : 'bg-amber-100 text-amber-800 border-amber-300 hover:bg-amber-200'
                        )}
                      >
                        <span className={'w-1.5 h-1.5 rounded-full ' + ((a.currentStock || 0) <= 0 ? 'bg-red-600' : 'bg-amber-600')}></span>
                        <span className="truncate max-w-[180px]">{a.name}</span>
                        {a.currentStock != null && a.minStock != null && (
                          <span className="opacity-70 font-mono text-[10px]">
                            {a.currentStock}/{a.minStock} {a.unit || ''}
                          </span>
                        )}
                      </a>
                    ))}
                    {criticalNames.length > 6 && (
                      <span className="inline-flex items-center text-[11px] font-bold px-2 py-1 text-slate-500">
                        +{criticalNames.length - 6} autres
                      </span>
                    )}
                  </div>
                )}
              </div>
              <a
                href={movementsHref}
                className="px-3 py-1.5 rounded-lg bg-red-500 text-white text-xs font-bold hover:bg-red-600 transition shrink-0 self-start"
              >
                {singleItem ? 'Voir ' + singleItem.name : 'Voir mouvements'}
              </a>
            </div>
          </div>
        );
      })()}`;

if (!s.includes(old)) {
  console.error('❌ anchor introuvable');
  // debug
  const idx = s.indexOf('totalAlerts > 0');
  if (idx > 0) console.error('Contexte:\n' + s.slice(idx - 100, idx + 500));
  process.exit(1);
}

s = s.replace(old, neu);
fs.writeFileSync(p, s);
console.log('✅ Bandeau enrichi + lien filtre');
