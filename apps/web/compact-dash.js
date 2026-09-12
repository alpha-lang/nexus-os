const fs = require('fs');
const p = 'app/dashboard/page.tsx';
let s = fs.readFileSync(p, 'utf8');
let n = 0;
function tryR(old, neu, label) {
  if (!s.includes(old)) { console.warn(`  MISS ${label}`); return false; }
  s = s.replace(old, neu); console.log(`  OK ${label}`); n++; return true;
}

console.log('Compactage dashboard...');

// ═══ 1. HERO : réduire padding ═══
tryR(
  `<div className="relative bg-slate-900 rounded-2xl px-5 py-4 text-white overflow-hidden">`,
  `<div className="relative bg-slate-900 rounded-2xl px-4 py-3 text-white overflow-hidden">`,
  "hero padding"
);

tryR(
  `<h1 className="text-xl md:text-2xl font-black tracking-tight leading-tight">`,
  `<h1 className="text-base md:text-lg font-black tracking-tight leading-tight">`,
  "hero titre"
);

tryR(
  `<p className="text-2xl font-black tabular-nums text-white leading-none mt-0.5">`,
  `<p className="text-lg font-black tabular-nums text-white leading-none mt-0.5">`,
  "hero clock"
);

// ═══ 2. KPI CARDS (composant) : réduire padding ═══
tryR(
  `      className={\`group bg-white rounded-2xl border \${a.border} p-5 hover:shadow-lg hover:-translate-y-0.5 transition-all\`}`,
  `      className={\`group bg-white rounded-xl border \${a.border} p-3 hover:shadow-md transition-all\`}`,
  "KpiCard padding"
);

tryR(
  `      <div className="flex items-start justify-between mb-3">
        <div className={\`w-11 h-11 rounded-xl \${a.bg} flex items-center justify-center shrink-0\`}>
          <span className={\`w-2.5 h-2.5 rounded-full \${a.text.replace('text-', 'bg-')}\`}></span>
        </div>`,
  `      <div className="flex items-start justify-between mb-2">
        <div className={\`w-7 h-7 rounded-lg \${a.bg} flex items-center justify-center shrink-0\`}>
          <span className={\`w-2 h-2 rounded-full \${a.text.replace('text-', 'bg-')}\`}></span>
        </div>`,
  "KpiCard icone"
);

tryR(
  `      <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest mb-1">{label}</p>
      <p className="text-3xl font-black text-slate-900 tabular-nums leading-none">{value}</p>
      {sub && <p className="text-[11px] text-slate-400 mt-2">{sub}</p>}`,
  `      <p className="text-[9px] text-slate-500 uppercase font-black tracking-widest mb-0.5">{label}</p>
      <p className="text-xl font-black text-slate-900 tabular-nums leading-none">{value}</p>
      {sub && <p className="text-[10px] text-slate-400 mt-1">{sub}</p>}`,
  "KpiCard textes"
);

// ═══ 3. Widget Stock : réduire padding ═══
tryR(
  `<div className="bg-white rounded-2xl border border-slate-200 p-4">
          <div className="flex items-center justify-between mb-3">`,
  `<div className="bg-white rounded-2xl border border-slate-200 p-3">
          <div className="flex items-center justify-between mb-2">`,
  "widget stock padding"
);

tryR(
  `<div className="grid grid-cols-3 gap-3">
            <a href="/dashboard/stock" className="rounded-xl p-3 bg-slate-50 hover:bg-slate-100 transition border border-slate-200">`,
  `<div className="grid grid-cols-3 gap-2">
            <a href="/dashboard/stock" className="rounded-lg p-2.5 bg-slate-50 hover:bg-slate-100 transition border border-slate-200">`,
  "widget grid padding"
);

tryR(
  `<p className="text-lg font-black text-slate-900 tabular-nums leading-tight">
                {Math.round(stockDash.summary?.totalValue || 0).toLocaleString('fr-FR')}
                <span className="text-xs text-slate-500 ml-1">Ar</span>
              </p>`,
  `<p className="text-base font-black text-slate-900 tabular-nums leading-tight">
                {Math.round(stockDash.summary?.totalValue || 0).toLocaleString('fr-FR')}
                <span className="text-[10px] text-slate-500 ml-1">Ar</span>
              </p>`,
  "widget value font"
);

// ═══ 4. Taux occupation : réduire ═══
tryR(
  `<div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 p-4">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h3 className="font-black text-slate-900 text-base">Taux d occupation</h3>
                  <p className="text-xs text-slate-500 mt-0.5">Aujourd hui</p>
                </div>`,
  `<div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 p-3">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <h3 className="font-black text-slate-900 text-sm">Taux d occupation</h3>
                  <p className="text-[10px] text-slate-500 mt-0.5">Aujourd hui</p>
                </div>`,
  "occupation header"
);

tryR(
  `<div className="flex items-baseline gap-2 mb-3">
                <span className="text-4xl font-black text-slate-900 tabular-nums">{stats.occupancy.occupiedRooms}</span>
                <span className="text-xl font-bold text-slate-300 tabular-nums">/ {stats.occupancy.totalRooms}</span>
                <span className="text-xs text-slate-500 ml-1">chambres</span>
              </div>`,
  `<div className="flex items-baseline gap-2 mb-2">
                <span className="text-2xl font-black text-slate-900 tabular-nums">{stats.occupancy.occupiedRooms}</span>
                <span className="text-base font-bold text-slate-300 tabular-nums">/ {stats.occupancy.totalRooms}</span>
                <span className="text-[10px] text-slate-500 ml-1">chambres</span>
              </div>`,
  "occupation chiffres"
);

tryR(
  `<div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden mb-3">`,
  `<div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden mb-2">`,
  "occupation bar"
);

// ═══ 5. Revenus : réduire ═══
tryR(
  `<div className="bg-slate-900 rounded-2xl p-4 text-white relative overflow-hidden">`,
  `<div className="bg-slate-900 rounded-2xl p-3 text-white relative overflow-hidden">`,
  "revenus padding"
);

tryR(
  `<p className="text-2xl font-black tabular-nums leading-none">
                  {stats.revenue.currentMonth.toLocaleString('fr-FR')}
                  <span className="text-xs text-slate-400 ml-1">Ar</span>
                </p>`,
  `<p className="text-lg font-black tabular-nums leading-none">
                  {stats.revenue.currentMonth.toLocaleString('fr-FR')}
                  <span className="text-[10px] text-slate-400 ml-1">Ar</span>
                </p>`,
  "revenus chiffre"
);

// ═══ 6. Feed cards : réduire padding ═══
tryR(
  `<div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
                <h3 className="font-black text-slate-900 text-sm">Reservations recentes</h3>`,
  `<div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-100">
                <h3 className="font-black text-slate-900 text-xs uppercase tracking-wider">Reservations recentes</h3>`,
  "feed reservations header"
);

tryR(
  `<div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
                <h3 className="font-black text-slate-900 text-sm">Chambres populaires</h3>
              </div>`,
  `<div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-100">
                <h3 className="font-black text-slate-900 text-xs uppercase tracking-wider">Chambres populaires</h3>
              </div>`,
  "feed chambres header"
);

// Feed rows
s = s.replace(/<div key=\{r\.id\} className="p-4 flex items-center gap-3 hover:bg-slate-50 transition">/g,
  `<div key={r.id} className="px-4 py-2 flex items-center gap-3 hover:bg-slate-50 transition">`);

s = s.replace(/<div key=\{i\} className="p-4 flex items-center gap-3">/g,
  `<div key={i} className="px-4 py-2 flex items-center gap-3">`);

// ═══ 7. Quick actions : réduire ═══
tryR(
  `<p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3">Actions rapides</p>`,
  `<p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Actions rapides</p>`,
  "quick actions titre"
);

tryR(
  `className="group flex items-center gap-3 p-3 bg-white rounded-xl border border-slate-200 hover:border-slate-400 hover:shadow-sm transition"`,
  `className="group flex items-center gap-2 px-3 py-2 bg-white rounded-lg border border-slate-200 hover:border-slate-400 hover:shadow-sm transition"`,
  "quick action card"
);

// QuickAction icon plus petit
tryR(
  `<div className="w-9 h-9 rounded-lg bg-slate-100 group-hover:bg-slate-900 flex items-center justify-center transition">`,
  `<div className="w-6 h-6 rounded-md bg-slate-100 group-hover:bg-slate-900 flex items-center justify-center transition">`,
  "quick action icone"
);

tryR(
  `<span className="text-xs font-bold text-slate-700 group-hover:text-slate-900 transition">{label}</span>`,
  `<span className="text-[11px] font-bold text-slate-700 group-hover:text-slate-900 transition">{label}</span>`,
  "quick action label"
);

// ═══ 8. Gaps entre sections : réduire ═══
// Le conteneur principal
tryR(
  `    <div className="space-y-5">
      {toast &&`,
  `    <div className="space-y-3">
      {toast &&`,
  "space-y-5 → space-y-3 (main)"
);

// ═══ 9. Grid 4 KPI : gap plus serré ═══
tryR(
  `<div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <KpiCard
              label="Arrivees"`,
  `<div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
            <KpiCard
              label="Arrivees"`,
  "grid KPI hôtel gap"
);

fs.writeFileSync(p, s);
console.log(`\n✅ ${n} modification(s)`);
