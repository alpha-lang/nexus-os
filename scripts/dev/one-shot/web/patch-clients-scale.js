const fs = require("fs");
const p = "app/dashboard/clients/page.tsx";
let s = fs.readFileSync(p, "utf8");
let n = 0;
function tryR(old, neu, label) {
  if (!s.includes(old)) { console.warn(`  SKIP ${label}`); return false; }
  s = s.replace(old, neu); console.log(`  OK ${label}`); n++; return true;
}

console.log("Patches clients scaling...");

// 1. Import hook + composant
tryR(
  `import { Modal, Button, PageHeader, FormField, Input, Select } from '../../../components/ui';`,
  `import { Modal, Button, PageHeader, FormField, Input, Select } from '../../../components/ui';
import { usePagination } from '../../../lib/usePagination';
import { Pagination } from '../../../lib/Pagination';`,
  "import hook"
);

// 2. State sort
tryR(
  `  const [cityFilter, setCityFilter] = useState('');`,
  `  const [cityFilter, setCityFilter] = useState('');
  const [sort, setSort] = useState<'recent' | 'name' | 'city'>('recent');`,
  "state sort"
);

// 3. Reset page sur filtres (via hook, mais on traque les changements)
tryR(
  `  useEffect(() => {
    load().catch(console.error).finally(() => setLoading(false));
  }, []);`,
  `  useEffect(() => {
    load().catch(console.error).finally(() => setLoading(false));
  }, []);

  // Reset pagination quand filtres changent
  useEffect(() => {
    pag.setPage(1);
  }, [search, cityFilter, sort]);`,
  "reset page"
);

// 4. Ajouter tri dans filtered + hook pagination
tryR(
  `    return list;
  }, [customers, search, cityFilter]);`,
  `    list.sort((a, b) => {
      if (sort === 'name') {
        const an = (a.firstName || '') + ' ' + (a.lastName || '');
        const bn = (b.firstName || '') + ' ' + (b.lastName || '');
        return an.localeCompare(bn);
      }
      if (sort === 'city') return (a.city || '').localeCompare(b.city || '');
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
    return list;
  }, [customers, search, cityFilter, sort]);

  const pag = usePagination(filtered, { perPageDefault: 12 });`,
  "tri + hook"
);

// 5. Utiliser pag.pageItems au lieu de filtered
tryR(
  `              {filtered.map((c) => (`,
  `              {pag.pageItems.map((c) => (`,
  "tbody → pageItems"
);

// 6. Ajouter tri + perPage à côté de la barre recherche
tryR(
  `      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4 grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="md:col-span-2">
          <Input
            type="text"
            placeholder="Rechercher par nom, email, téléphone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            icon={
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            }
          />
        </div>
        <Select value={cityFilter} onChange={(e) => setCityFilter(e.target.value)}>
          <option value="">Toutes les villes</option>
          {cities.map((c) => <option key={c} value={c}>{c}</option>)}
        </Select>
      </div>`,
  `      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4 space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div className="md:col-span-2">
            <Input
              type="text"
              placeholder="Rechercher par nom, email, telephone..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              icon={
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              }
            />
          </div>
          <Select value={cityFilter} onChange={(e) => setCityFilter(e.target.value)}>
            <option value="">Toutes les villes</option>
            {cities.map((c) => <option key={c} value={c}>{c}</option>)}
          </Select>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as any)}
            className="px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 cursor-pointer"
          >
            <option value="recent">Plus recents</option>
            <option value="name">Nom A-Z</option>
            <option value="city">Ville</option>
          </select>
        </div>
        <div className="flex items-center justify-between text-xs text-slate-500">
          <div>
            <span className="font-semibold">{filtered.length}</span> client{filtered.length > 1 ? 's' : ''}
            {(search || cityFilter) && (
              <button
                onClick={() => { setSearch(''); setCityFilter(''); }}
                className="ml-2 text-teal-600 hover:underline font-medium"
              >
                Effacer
              </button>
            )}
          </div>
        </div>
      </div>`,
  "toolbar tri"
);

// 7. Pagination avant le Modal
tryR(
  `      <Modal
        open={showModal}
        onClose={() => setShowModal(false)}`,
  `      <Pagination
        page={pag.page}
        totalPages={pag.totalPages}
        onPageChange={pag.setPage}
        perPage={pag.perPage}
        perPageOptions={pag.perPageOptions}
        onPerPageChange={pag.setPerPage}
        total={pag.total}
      />

      <Modal
        open={showModal}
        onClose={() => setShowModal(false)}`,
  "pagination UI"
);

fs.writeFileSync(p, s);
console.log(`\nTotal : ${n}/7 patch(es)`);
