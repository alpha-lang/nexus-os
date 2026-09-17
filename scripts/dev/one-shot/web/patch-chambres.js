const fs = require("fs");
const p = "app/dashboard/reservations/chambres/page.tsx";
let s = fs.readFileSync(p, "utf8");
let n = 0;
function tryR(old, neu, label, guard) {
  if (guard && s.includes(guard)) { console.log(`  SKIP ${label} (deja present)`); return false; }
  if (!s.includes(old)) { console.warn(`  MISS ${label}`); return false; }
  s = s.replace(old, neu); console.log(`  OK ${label}`); n++; return true;
}

console.log("Patches chambres...");

// 1. Import hook (avec garde anti-doublon)
tryR(
  `import { Modal, Button, Badge, PageHeader, FormField, Input, Select, Textarea } from '../../../../components/ui';`,
  `import { Modal, Button, Badge, PageHeader, FormField, Input, Select, Textarea } from '../../../../components/ui';
import { usePagination } from '../../../../lib/usePagination';
import { Pagination } from '../../../../lib/Pagination';`,
  "import hook",
  "lib/usePagination"
);

// 2. Ajouter states filters
tryR(
  `  const [tab, setTab] = useState<'rooms' | 'types'>('rooms');`,
  `  const [tab, setTab] = useState<'rooms' | 'types'>('rooms');
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [filterType, setFilterType] = useState<string>('ALL');
  const [sort, setSort] = useState<'number' | 'floor' | 'status'>('number');`,
  "states filters",
  "filterStatus"
);

// 3. Remplacer le rendu de la table chambres (ajouter recherche + filtres + pagination)
tryR(
  `      {/* Chambres */}
      {tab === 'rooms' && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 border-b border-gray-200">
                <tr>
                  <th className="p-4 font-semibold text-slate-600">N°</th>
                  <th className="p-4 font-semibold text-slate-600">Étage</th>
                  <th className="p-4 font-semibold text-slate-600">Type</th>
                  <th className="p-4 font-semibold text-slate-600">Capacité</th>
                  <th className="p-4 font-semibold text-slate-600">Prix/nuit</th>
                  <th className="p-4 font-semibold text-slate-600">Statut</th>
                  <th className="p-4 font-semibold text-slate-600">Notes</th>
                  <th className="p-4 font-semibold text-slate-600 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {rooms.map((r) => {`,
  `      {/* Chambres */}
      {tab === 'rooms' && (
        <>
        {/* Barre recherche + filtres */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-3 space-y-3">
          <div className="relative">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
              </svg>
            </span>
            <input
              type="text"
              placeholder="Rechercher par numero, type..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:ring-2 focus:ring-teal-400 focus:border-teal-400 focus:bg-white transition"
            />
          </div>
          <div className="flex flex-wrap gap-1.5">
            {[
              { v: 'ALL', l: 'Toutes' },
              { v: 'AVAILABLE', l: 'Disponibles' },
              { v: 'OCCUPIED', l: 'Occupees' },
              { v: 'CLEANING', l: 'Menage' },
              { v: 'MAINTENANCE', l: 'Maintenance' },
            ].map(f => (
              <button
                key={f.v}
                onClick={() => setFilterStatus(f.v)}
                className={\`px-3 py-1.5 rounded-lg text-xs font-bold transition \${filterStatus === f.v ? 'bg-slate-900 text-white shadow-md' : 'bg-white border border-slate-200 text-slate-600 hover:border-slate-400'}\`}
              >
                {f.l}
              </button>
            ))}
            {roomTypes.length > 0 && (
              <>
                <span className="w-px bg-slate-200 mx-1"></span>
                <button
                  onClick={() => setFilterType('ALL')}
                  className={\`px-3 py-1.5 rounded-lg text-xs font-bold transition \${filterType === 'ALL' ? 'bg-slate-900 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:border-slate-400'}\`}
                >
                  Tous types
                </button>
                {roomTypes.map((t: any) => (
                  <button
                    key={t.id}
                    onClick={() => setFilterType(t.id)}
                    className={\`px-3 py-1.5 rounded-lg text-xs font-bold transition \${filterType === t.id ? 'bg-slate-900 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:border-slate-400'}\`}
                  >
                    {t.name}
                  </button>
                ))}
              </>
            )}
            <select
              value={sort}
              onChange={e => setSort(e.target.value as any)}
              className="ml-auto px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-700 cursor-pointer"
            >
              <option value="number">N° croissant</option>
              <option value="floor">Etage</option>
              <option value="status">Statut</option>
            </select>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 border-b border-gray-200">
                <tr>
                  <th className="p-4 font-semibold text-slate-600">N°</th>
                  <th className="p-4 font-semibold text-slate-600">Étage</th>
                  <th className="p-4 font-semibold text-slate-600">Type</th>
                  <th className="p-4 font-semibold text-slate-600">Capacité</th>
                  <th className="p-4 font-semibold text-slate-600">Prix/nuit</th>
                  <th className="p-4 font-semibold text-slate-600">Statut</th>
                  <th className="p-4 font-semibold text-slate-600">Notes</th>
                  <th className="p-4 font-semibold text-slate-600 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {pagRooms.pageItems.map((r) => {`,
  "table rooms : ajout filtres + pagination"
);

// 4. Calcul pagRooms avant le return (après le if loading)
tryR(
  `  if (loading) return <div className="flex justify-center items-center h-64">Chargement...</div>;

  const totalRooms = rooms.length;`,
  `  const filteredRooms = rooms.filter(r => {
    if (filterStatus !== 'ALL' && r.status !== filterStatus) return false;
    if (filterType !== 'ALL' && r.roomTypeId !== filterType) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      const hay = \`\${r.number} \${r.roomType?.name || ''} \${r.notes || ''}\`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  }).sort((a, b) => {
    if (sort === 'floor') return (a.floor || 0) - (b.floor || 0);
    if (sort === 'status') return (a.status || '').localeCompare(b.status || '');
    return String(a.number).localeCompare(String(b.number), undefined, { numeric: true });
  });

  const pagRooms = usePagination(filteredRooms, { perPageDefault: 15 });

  if (loading) return <div className="flex justify-center items-center h-64">Chargement...</div>;

  const totalRooms = rooms.length;`,
  "filteredRooms + hook",
  "pagRooms"
);

// 5. Fermer le fragment <> après le div table chambres
tryR(
  `              {rooms.length === 0 && (
                  <tr><td colSpan={8} className="p-8 text-center text-slate-400">Aucune chambre</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Types */}`,
  `              {pagRooms.pageItems.length === 0 && (
                  <tr><td colSpan={8} className="p-8 text-center text-slate-400">Aucune chambre ne correspond aux filtres</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <Pagination
          page={pagRooms.page}
          totalPages={pagRooms.totalPages}
          onPageChange={pagRooms.setPage}
          perPage={pagRooms.perPage}
          perPageOptions={pagRooms.perPageOptions}
          onPerPageChange={pagRooms.setPerPage}
          total={pagRooms.total}
        />
        </>
      )}

      {/* Types */}`,
  "fermeture fragment + pagination"
);

fs.writeFileSync(p, s);
console.log(`\nTotal : ${n}/5 patch(es)`);
