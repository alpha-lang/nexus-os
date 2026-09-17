const fs = require("fs");
const p = "app/dashboard/page.tsx";
let s = fs.readFileSync(p, "utf8");
let n = 0;
function tryR(old, neu, label) {
  if (!s.includes(old)) { console.warn(`  SKIP ${label}`); return false; }
  s = s.replace(old, neu); console.log(`  OK ${label}`); n++; return true;
}

console.log("Patch dashboard compact...");

// 1. Hero compact : horizontal, moins de padding, clock à droite inline
tryR(
  `      <div className="relative bg-slate-900 rounded-3xl p-6 md:p-8 text-white overflow-hidden">`,
  `      <div className="relative bg-slate-900 rounded-2xl px-5 py-4 text-white overflow-hidden">`,
  "hero padding reduit"
);

tryR(
  `        <div className="relative flex flex-col md:flex-row md:items-end md:justify-between gap-6">
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-3">
              <span className={\`inline-flex items-center gap-1.5 text-[10px] font-black tracking-widest px-2.5 py-1 rounded-md \${
                isSuperAdmin ? 'bg-amber-400/20 text-amber-300' : 'bg-teal-400/20 text-teal-300'
              }\`}>
                <span className={\`w-1.5 h-1.5 rounded-full \${isSuperAdmin ? 'bg-amber-400' : 'bg-teal-400'}\`}></span>
                {isSuperAdmin ? 'SUPER ADMIN' : (user?.organization?.name || 'ORGANISATION')}
              </span>
              <span className="text-[10px] font-bold text-slate-400 tracking-wider">
                {now.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
              </span>
            </div>
            <h1 className="text-3xl md:text-4xl font-black tracking-tight leading-tight">
              {greeting}, <span className="text-teal-400">{user?.name?.split(' ')[0] || 'Utilisateur'}</span>
            </h1>
            <p className="text-sm text-slate-400 mt-2 max-w-2xl">
              {isSuperAdmin
                ? 'Vue executive de la plateforme et de vos tenants.'
                : \`Vue d ensemble de \${user?.organization?.name || 'votre organisation'}.\`}
            </p>
          </div>

          {/* Horloge + timezone */}
          <div className="flex items-center gap-4 shrink-0">
            <div className="text-right">
              <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest">Heure locale</p>
              <p className="text-4xl font-black tabular-nums text-white leading-none mt-1">
                {now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
              </p>
              <p className="text-[10px] text-slate-500 mt-1 tabular-nums">
                {now.toLocaleTimeString('fr-FR', { second: '2-digit' })} sec
              </p>
            </div>
          </div>
        </div>`,
  `        <div className="relative flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-1.5">
              <span className={\`inline-flex items-center gap-1.5 text-[10px] font-black tracking-widest px-2 py-0.5 rounded-md \${
                isSuperAdmin ? 'bg-amber-400/20 text-amber-300' : 'bg-teal-400/20 text-teal-300'
              }\`}>
                <span className={\`w-1.5 h-1.5 rounded-full \${isSuperAdmin ? 'bg-amber-400' : 'bg-teal-400'}\`}></span>
                {isSuperAdmin ? 'SUPER ADMIN' : (user?.organization?.name || 'ORGANISATION')}
              </span>
              <span className="text-[10px] font-bold text-slate-400 tracking-wider">
                {now.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
              </span>
            </div>
            <h1 className="text-xl md:text-2xl font-black tracking-tight leading-tight">
              {greeting}, <span className="text-teal-400">{user?.name?.split(' ')[0] || 'Utilisateur'}</span>
            </h1>
          </div>

          <div className="flex items-center gap-4 shrink-0">
            <div className="text-right">
              <p className="text-[9px] text-slate-500 uppercase font-black tracking-widest">Heure locale</p>
              <p className="text-2xl font-black tabular-nums text-white leading-none mt-0.5">
                {now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
              </p>
              <p className="text-[9px] text-slate-500 mt-0.5 tabular-nums">
                {now.toLocaleTimeString('fr-FR', { second: '2-digit' })} sec
              </p>
            </div>
          </div>
        </div>`,
  "hero compact (200px → 100px)"
);

// 2. KPI cards moins hautes
tryR(
  `      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <KpiCard
              label="Arrivees"`,
  `      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <KpiCard
              label="Arrivees"`,
  "noop"
);

// 3. Taux d'occupation : réduire la taille des chiffres
tryR(
  `              <div className="flex items-baseline gap-3 mb-5">
                <span className="text-6xl font-black text-slate-900 tabular-nums">{stats.occupancy.occupiedRooms}</span>
                <span className="text-2xl font-bold text-slate-300 tabular-nums">/ {stats.occupancy.totalRooms}</span>
                <span className="text-sm text-slate-500 ml-2">chambres</span>
              </div>`,
  `              <div className="flex items-baseline gap-2 mb-3">
                <span className="text-4xl font-black text-slate-900 tabular-nums">{stats.occupancy.occupiedRooms}</span>
                <span className="text-xl font-bold text-slate-300 tabular-nums">/ {stats.occupancy.totalRooms}</span>
                <span className="text-xs text-slate-500 ml-1">chambres</span>
              </div>`,
  "chiffres occupation -40%"
);

// 4. Padding cards d'occupation réduit
tryR(
  `            <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 p-6">
              <div className="flex items-center justify-between mb-5">`,
  `            <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 p-4">
              <div className="flex items-center justify-between mb-3">`,
  "card occupation padding"
);

tryR(
  `              <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden mb-5">`,
  `              <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden mb-3">`,
  "barre occupation -1px"
);

tryR(
  `            <div className="bg-slate-900 rounded-2xl p-6 text-white relative overflow-hidden">`,
  `            <div className="bg-slate-900 rounded-2xl p-4 text-white relative overflow-hidden">`,
  "card revenus padding"
);

tryR(
  `                <p className="text-3xl font-black tabular-nums leading-none">
                  {stats.revenue.currentMonth.toLocaleString('fr-FR')}
                  <span className="text-sm text-slate-400 ml-2">Ar</span>
                </p>`,
  `                <p className="text-2xl font-black tabular-nums leading-none">
                  {stats.revenue.currentMonth.toLocaleString('fr-FR')}
                  <span className="text-xs text-slate-400 ml-1">Ar</span>
                </p>`,
  "chiffre revenus -30%"
);

// 5. Feed cards plus compact
tryR(
  `              <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
                <h3 className="font-black text-slate-900 text-sm">Reservations recentes</h3>`,
  `              <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
                <h3 className="font-black text-slate-900 text-sm">Reservations recentes</h3>`,
  "feed header compact"
);

tryR(
  `                  <div key={r.id} className="p-4 flex items-center gap-3 hover:bg-slate-50 transition">`,
  `                  <div key={r.id} className="px-4 py-2.5 flex items-center gap-3 hover:bg-slate-50 transition">`,
  "feed rows compact"
);

// 6. Gaps réduits dans les grids principaux
tryR(
  `          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 p-4">
              <div className="flex items-center justify-between mb-3">`,
  `          <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
            <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 p-4">
              <div className="flex items-center justify-between mb-3">`,
  "gap 4→3 grid"
);

fs.writeFileSync(p, s);
console.log(`\nTotal : ${n} patch(es)`);
