const fs = require("fs");
const p = "app/dashboard/subscriptions/page.tsx";
let s = fs.readFileSync(p, "utf8");
let n = 0;
function tryR(old, neu, label) {
  if (!s.includes(old)) { console.warn(`  SKIP ${label}`); return false; }
  s = s.replace(old, neu); console.log(`  OK ${label}`); n++; return true;
}

// 1. Import hook
tryR(
  `import { Modal, Button, FormField, Input, Select } from '../../../components/ui';`,
  `import { Modal, Button, FormField, Input, Select } from '../../../components/ui';
import { usePagination } from '../../../lib/usePagination';
import { Pagination } from '../../../lib/Pagination';`,
  "import hook"
);

// 2. State pagination dans le composant (après les states existants)
tryR(
  `  const [statusFilter, setStatusFilter] = useState<string>('ALL');`,
  `  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [sort, setSort] = useState<'recent' | 'name' | 'mrr'>('recent');`,
  "state sort"
);

// 3. Reset pagination quand filtres changent
tryR(
  `  useEffect(() => { load().catch(console.error).finally(() => setLoading(false)); }, []);`,
  `  useEffect(() => { load().catch(console.error).finally(() => setLoading(false)); }, []);
  // reset pagination gerer par le hook`,
  "noop"
);

// 4. Ajouter tri dans filtered + pagination
tryR(
  `    return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [subscriptions, statusFilter, search]);`,
  `    list.sort((a, b) => {
      if (sort === 'name') return (a.organization?.name || '').localeCompare(b.organization?.name || '');
      if (sort === 'mrr') return computePrice(b) - computePrice(a);
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
    return list;
  }, [subscriptions, statusFilter, search, sort]);

  const pag = usePagination(filtered, { perPageDefault: 6 });`,
  "tri + hook pagination"
);

// 5. Barre sort + reset à droite de la recherche
tryR(
  `          <div className="md:col-span-2 flex flex-wrap gap-1.5">
            {['ALL', 'TRIAL', 'ACTIVE', 'SUSPENDED', 'EXPIRED'].map(s => (`,
  `          <div className="md:col-span-2 flex flex-wrap gap-1.5 items-center">
            <select
              value={sort}
              onChange={e => { setSort(e.target.value as any); pag.setPage(1); }}
              className="px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 cursor-pointer"
            >
              <option value="recent">Recents</option>
              <option value="name">Nom A-Z</option>
              <option value="mrr">MRR decroissant</option>
            </select>
            {['ALL', 'TRIAL', 'ACTIVE', 'SUSPENDED', 'EXPIRED'].map(s => (`,
  "select tri"
);

// 6. Utiliser pag.pageItems au lieu de filtered
tryR(
  `          {filtered.map(sub => {`,
  `          {pag.pageItems.map(sub => {`,
  "grille → pageItems"
);

// 7. Ajouter Pagination avant le Modal
tryR(
  `      {/* Modal */}
      <Modal
        open={showModal}`,
  `      <Pagination
        page={pag.page}
        totalPages={pag.totalPages}
        onPageChange={pag.setPage}
        perPage={pag.perPage}
        perPageOptions={pag.perPageOptions}
        onPerPageChange={pag.setPerPage}
        total={pag.total}
      />

      {/* Modal */}
      <Modal
        open={showModal}`,
  "pagination UI"
);

fs.writeFileSync(p, s);
console.log(`\nTotal : ${n}/6 patch(es)`);
