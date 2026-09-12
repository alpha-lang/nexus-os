const fs = require("fs");
const p = "app/dashboard/caisse/tables/page.tsx";
let s = fs.readFileSync(p, "utf8");
let n = 0;
function tryR(old, neu, label) {
  if (!s.includes(old)) { console.warn(`  MISS ${label}`); return false; }
  s = s.replace(old, neu); console.log(`  OK ${label}`); n++; return true;
}

console.log("Patch plan de salle...");

// 1. States additionnels
tryR(
  `  const [locationFilter, setLocationFilter] = useState('RESTAURANT');`,
  `  const [locationFilter, setLocationFilter] = useState('ALL');
  const [search, setSearch] = useState('');
  const [view, setView] = useState<'confort' | 'compact'>('confort');`,
  "states search + view + ALL"
);

// 2. Filter + counts enrichis
tryR(
  `  const filtered = tables.filter((t) => t.location === locationFilter);
  const counts = {
    free: tables.filter((t) => t.status === 'FREE').length,
    occupied: tables.filter((t) => t.status === 'OCCUPIED').length,
  };`,
  `  const filtered = tables.filter((t) => {
    if (locationFilter !== 'ALL' && t.location !== locationFilter) return false;
    if (search.trim() && !t.number.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const counts = {
    total: tables.length,
    free: tables.filter((t) => t.status === 'FREE').length,
    occupied: tables.filter((t) => t.status === 'OCCUPIED').length,
    reserved: tables.filter((t) => t.status === 'RESERVED').length,
    cleaning: tables.filter((t) => t.status === 'CLEANING').length,
  };

  const filteredStats = {
    count: filtered.length,
    capacity: filtered.reduce((sum, t) => sum + (t.capacity || 0), 0),
  };`,
  "filtered + counts enrichis"
);

// 3. Header enrichi
tryR(
  `        <div>
          <h1 className="text-2xl font-bold text-slate-900">Plan de salle</h1>
          <p className="text-slate-500 mt-1 text-sm">
            {counts.free} libre{counts.free > 1 ? 's' : ''} - {counts.occupied} occupee{counts.occupied > 1 ? 's' : ''}
          </p>
        </div>`,
  `        <div>
          <h1 className="text-2xl font-bold text-slate-900">Plan de salle</h1>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-sm">
            <span className="text-slate-500">{counts.total} table{counts.total > 1 ? 's' : ''}</span>
            <span className="text-slate-300">·</span>
            <span className="text-green-600 font-bold">{counts.free} libre{counts.free > 1 ? 's' : ''}</span>
            <span className="text-slate-300">·</span>
            <span className="text-red-600 font-bold">{counts.occupied} occupee{counts.occupied > 1 ? 's' : ''}</span>
            {counts.reserved > 0 && (
              <>
                <span className="text-slate-300">·</span>
                <span className="text-amber-600 font-bold">{counts.reserved} reservee{counts.reserved > 1 ? 's' : ''}</span>
              </>
            )}
            {counts.cleaning > 0 && (
              <>
                <span className="text-slate-300">·</span>
                <span className="text-slate-500 font-bold">{counts.cleaning} a nettoyer</span>
              </>
            )}
          </div>
        </div>`,
  "header enrichi"
);

// 4. Toolbar (recherche + toggle) AVANT les tabs
tryR(
  `      {/* Tabs zones */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-2 flex gap-2 overflow-x-auto">
        {LOCATIONS.map((loc) => {
          const isActive = locationFilter === loc.id;
          const count = tables.filter((t) => t.location === loc.id).length;
          return (
            <button
              key={loc.id}
              onClick={() => setLocationFilter(loc.id)}
              className={\`flex items-center gap-2 px-4 py-3 rounded-xl font-semibold whitespace-nowrap transition \${
                isActive
                  ? \`bg-linear-to-r \${loc.gradient} text-white shadow-md\`
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }\`}
            >
              <span>{loc.label}</span>
              <span className={\`text-xs px-2 py-0.5 rounded-full \${isActive ? 'bg-white/30' : 'bg-white'}\`}>
                {count}
              </span>
            </button>
          );
        })}
      </div>`,
  `      {/* Recherche + Toggle view */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-3">
        <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center">
          <div className="relative flex-1">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
              </svg>
            </span>
            <input
              type="text"
              placeholder="Rechercher une table par numero..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:ring-2 focus:ring-teal-400 focus:border-teal-400 focus:bg-white transition"
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-700">✕</button>
            )}
          </div>
          <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-0.5 shrink-0 self-start sm:self-auto">
            <button
              onClick={() => setView('confort')}
              className={\`px-3 py-1.5 rounded-md text-xs font-bold transition \${view === 'confort' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}\`}
            >
              Confort
            </button>
            <button
              onClick={() => setView('compact')}
              className={\`px-3 py-1.5 rounded-md text-xs font-bold transition \${view === 'compact' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}\`}
            >
              Compact
            </button>
          </div>
        </div>
      </div>

      {/* Tabs zones */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-2 flex gap-2 overflow-x-auto">
        <button
          onClick={() => setLocationFilter('ALL')}
          className={\`flex items-center gap-2 px-4 py-3 rounded-xl font-semibold whitespace-nowrap transition \${
            locationFilter === 'ALL'
              ? 'bg-slate-900 text-white shadow-md'
              : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
          }\`}
        >
          <span>Toutes</span>
          <span className={\`text-xs px-2 py-0.5 rounded-full \${locationFilter === 'ALL' ? 'bg-white/30' : 'bg-white'}\`}>
            {counts.total}
          </span>
        </button>
        {LOCATIONS.map((loc) => {
          const isActive = locationFilter === loc.id;
          const count = tables.filter((t) => t.location === loc.id).length;
          const cap = tables.filter((t) => t.location === loc.id).reduce((s, t) => s + (t.capacity || 0), 0);
          if (count === 0 && !isActive) return null;
          return (
            <button
              key={loc.id}
              onClick={() => setLocationFilter(loc.id)}
              className={\`flex items-center gap-2 px-4 py-3 rounded-xl font-semibold whitespace-nowrap transition \${
                isActive
                  ? \`bg-linear-to-r \${loc.gradient} text-white shadow-md\`
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }\`}
            >
              <span>{loc.label}</span>
              <span className={\`text-xs px-2 py-0.5 rounded-full \${isActive ? 'bg-white/30' : 'bg-white'}\`}>
                {count}
              </span>
              {cap > 0 && (
                <span className={\`text-[10px] \${isActive ? 'opacity-80' : 'opacity-60'}\`}>
                  {cap} pl.
                </span>
              )}
            </button>
          );
        })}
      </div>`,
  "toolbar + tabs enrichis"
);

// 5. Grid adaptatif selon view
tryR(
  `      {/* Grid */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
        {filtered.length === 0 ? (
          <div className="text-center py-12 text-slate-400">Aucune table dans cette zone</div>
        ) : (
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-4">
            {filtered.map((t) => (
              <button
                key={t.id}
                onClick={() => openModal(t)}
                className={\`group aspect-square rounded-3xl p-4 flex flex-col items-center justify-center transition-all hover:-translate-y-1 hover:shadow-xl \${
                  t.status === 'FREE'
                    ? 'bg-linear-to-br from-green-400 to-emerald-500 text-white'
                    : t.status === 'OCCUPIED'
                    ? 'bg-linear-to-br from-red-400 to-rose-500 text-white'
                    : t.status === 'RESERVED'
                    ? 'bg-linear-to-br from-amber-400 to-orange-500 text-white'
                    : 'bg-linear-to-br from-slate-300 to-slate-400 text-white'
                }\`}
              >
                <div className="text-3xl font-black">{t.number}</div>
                <div className="text-xs opacity-90 mt-1">{t.capacity} pl.</div>
              </button>
            ))}
          </div>
        )}
      </div>`,
  `      {/* Grid */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4 sm:p-6">
        {filtered.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center text-2xl mx-auto mb-3">🪑</div>
            <p className="text-slate-500 font-semibold">
              {search || locationFilter !== 'ALL' ? 'Aucune table ne correspond' : 'Aucune table'}
            </p>
            <p className="text-xs text-slate-400 mt-1">
              {search ? 'Essayez un autre numero' : 'Ajoutez une table pour commencer'}
            </p>
            {(search || locationFilter !== 'ALL') && (
              <button
                onClick={() => { setSearch(''); setLocationFilter('ALL'); }}
                className="mt-3 text-xs font-bold text-teal-600 hover:underline"
              >
                Reinitialiser les filtres
              </button>
            )}
          </div>
        ) : view === 'confort' ? (
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-4">
            {filtered.map((t) => (
              <button
                key={t.id}
                onClick={() => openModal(t)}
                className={\`group aspect-square rounded-3xl p-4 flex flex-col items-center justify-center transition-all hover:-translate-y-1 hover:shadow-xl \${
                  t.status === 'FREE'
                    ? 'bg-linear-to-br from-green-400 to-emerald-500 text-white'
                    : t.status === 'OCCUPIED'
                    ? 'bg-linear-to-br from-red-400 to-rose-500 text-white'
                    : t.status === 'RESERVED'
                    ? 'bg-linear-to-br from-amber-400 to-orange-500 text-white'
                    : 'bg-linear-to-br from-slate-300 to-slate-400 text-white'
                }\`}
              >
                <div className="text-3xl font-black">{t.number}</div>
                <div className="text-xs opacity-90 mt-1">{t.capacity} pl.</div>
              </button>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-2">
            {filtered.map((t) => (
              <button
                key={t.id}
                onClick={() => openModal(t)}
                title={\`\${t.number} - \${t.capacity} pl. - \${t.status}\`}
                className={\`aspect-square rounded-xl flex flex-col items-center justify-center transition-all hover:scale-105 hover:shadow-lg \${
                  t.status === 'FREE'
                    ? 'bg-green-500 text-white'
                    : t.status === 'OCCUPIED'
                    ? 'bg-red-500 text-white'
                    : t.status === 'RESERVED'
                    ? 'bg-amber-500 text-white'
                    : 'bg-slate-400 text-white'
                }\`}
              >
                <div className="text-base font-black leading-none">{t.number}</div>
                <div className="text-[9px] opacity-90 mt-0.5">{t.capacity}p</div>
              </button>
            ))}
          </div>
        )}
      </div>`,
  "grid + empty + compact"
);

fs.writeFileSync(p, s);
console.log(`\nTotal : ${n}/5 patch(es)`);
