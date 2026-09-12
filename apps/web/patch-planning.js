const fs = require("fs");
const p = "app/dashboard/reservations/planning/page.tsx";
let s = fs.readFileSync(p, "utf8");
let n = 0;
function tryR(old, neu, label) {
  if (!s.includes(old)) { console.warn(`  SKIP ${label}`); return false; }
  s = s.replace(old, neu); console.log(`  OK ${label}`); n++; return true;
}

console.log("Patches planning...");

// 1. Fix legende : contraste + tailles explicites
tryR(
  `<div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4 flex flex-wrap items-center gap-4 text-xs">
        <span className="font-semibold text-slate-600">Légende :</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-yellow-400"></span> En attente</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-blue-500"></span> Confirmée</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-green-500"></span> En séjour</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-slate-400"></span> Terminée</span>
      </div>`,
  `<div className="bg-white rounded-2xl shadow-sm border border-slate-200 px-4 py-3 flex flex-wrap items-center gap-4">
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
      </div>`,
  "legende contraste"
);

// 2. Ajouter indicateur de charge quotidienne dans le header (colonne sous la date)
tryR(
  `                <div className="text-[10px] text-slate-400">
                  {d.toLocaleDateString('fr-FR', { month: 'short' })}
                </div>`,
  `                <div className="text-[10px] text-slate-400">
                  {d.toLocaleDateString('fr-FR', { month: 'short' })}
                </div>
                {(() => {
                  const count = reservations.filter(r => {
                    const ci = startOfDay(new Date(r.checkInDate));
                    const co = startOfDay(new Date(r.checkOutDate));
                    return d.getTime() >= ci.getTime() && d.getTime() < co.getTime();
                  }).length;
                  const pct = rooms.length > 0 ? count / rooms.length : 0;
                  const bg = pct >= 0.9 ? 'bg-red-500 text-white' :
                             pct >= 0.6 ? 'bg-amber-400 text-slate-900' :
                             count > 0 ? 'bg-teal-500 text-white' :
                             'bg-slate-200 text-slate-500';
                  return (
                    <div className={\`mt-1 text-[10px] font-black rounded-md px-1.5 py-0.5 \${bg}\`}>
                      {count}/{rooms.length}
                    </div>
                  );
                })()}`,
  "charge quotidienne"
);

// 3. Ajouter un trait vertical pour aujourd hui
tryR(
  `                    return (
                      <div
                        key={i}
                        className={\`border-r border-slate-100 relative \${
                          isToday ? 'bg-teal-50/40' : isWeekend ? 'bg-slate-50/50' : ''
                        }\`}
                        style={{ height: '64px' }}
                      ></div>
                    );`,
  `                    return (
                      <div
                        key={i}
                        className={\`border-r border-slate-100 relative \${
                          isToday ? 'bg-teal-50/40' : isWeekend ? 'bg-slate-50/50' : ''
                        }\`}
                        style={{ height: '64px' }}
                      >
                        {isToday && (
                          <div className="absolute left-1/2 top-0 bottom-0 w-0.5 bg-teal-500/60 -translate-x-1/2 pointer-events-none"></div>
                        )}
                      </div>
                    );`,
  "trait vertical aujourd hui"
);

// 4. Ajouter un KPI en haut : taux d occupation globale sur la periode
tryR(
  `      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Planning</h1>
          <p className="text-slate-500 mt-1 text-sm">
            Vue calendrier des réservations par chambre
          </p>
        </div>`,
  `      {/* Header */}
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
        </div>`,
  "kpi occupation"
);

fs.writeFileSync(p, s);
console.log(`\nTotal : ${n}/4 patch(es)`);
