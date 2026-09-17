const fs = require("fs");
const p = "app/dashboard/tenant-admins/page.tsx";
let s = fs.readFileSync(p, "utf8");
let n = 0;
function tryR(old, neu, label) {
  if (!s.includes(old)) { console.warn(`  SKIP ${label}`); return false; }
  s = s.replace(old, neu); console.log(`  OK ${label}`); n++; return true;
}

console.log("Patches tenant-admins scaling...");

// 1. State tri + pagination + view
tryR(
  `  const [orgFilter, setOrgFilter] = useState<string>('ALL');`,
  `  const [orgFilter, setOrgFilter] = useState<string>('ALL');
  const [sort, setSort] = useState<'role' | 'name' | 'org' | 'status'>('role');
  const [perPage, setPerPage] = useState(12);
  const [page, setPage] = useState(1);`,
  "state tri + pagination"
);

// 2. Reset page quand filtres changent
tryR(
  `  useEffect(() => { load().catch(console.error).finally(() => setLoading(false)); }, []);`,
  `  useEffect(() => { load().catch(console.error).finally(() => setLoading(false)); }, []);

  useEffect(() => { setPage(1); }, [search, orgFilter, sort, perPage]);`,
  "reset page"
);

// 3. Tri dans filtered + pagination slices
tryR(
  `    return list.sort((a, b) => {
      const oa = a.organization?.name || '';
      const ob = b.organization?.name || '';
      if (oa !== ob) return oa.localeCompare(ob);
      return (a.name || a.email || '').localeCompare(b.name || b.email || '');
    });
  }, [admins, orgFilter, search]);`,
  `    list.sort((a, b) => {
      if (sort === 'role') {
        const order = (r: string) => r === 'SUPER_ADMIN' ? 0 : 1;
        const da = order(a.role) - order(b.role);
        if (da !== 0) return da;
      }
      if (sort === 'status') {
        const da = (a.isActive ? 0 : 1) - (b.isActive ? 0 : 1);
        if (da !== 0) return da;
      }
      if (sort === 'name') {
        return (a.name || a.email || '').localeCompare(b.name || b.email || '');
      }
      const oa = a.organization?.name || '';
      const ob = b.organization?.name || '';
      if (oa !== ob) return oa.localeCompare(ob);
      return (a.name || a.email || '').localeCompare(b.name || b.email || '');
    });
    return list;
  }, [admins, orgFilter, search, sort]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / perPage));
  const pageItems = filtered.slice((page - 1) * perPage, page * perPage);`,
  "tri + slices"
);

// 4. Barre tri + per page après chips organisations
tryR(
  `          {organizations.filter((o: any) => orgCounts[o.id] > 0).map((o: any) => (
            <button
              key={o.id}
              onClick={() => setOrgFilter(o.id)}
              className={\`px-3 py-1.5 rounded-lg text-xs font-bold transition \${
                orgFilter === o.id ? 'bg-slate-900 text-white shadow-md' : 'bg-white border border-slate-200 text-slate-600 hover:border-slate-400'
              }\`}
            >
              {o.name} <span className="opacity-60 ml-1">{orgCounts[o.id]}</span>
            </button>
          ))}
        </div>
      </div>`,
  `          {organizations.filter((o: any) => orgCounts[o.id] > 0).map((o: any) => (
            <button
              key={o.id}
              onClick={() => setOrgFilter(o.id)}
              className={\`px-3 py-1.5 rounded-lg text-xs font-bold transition \${
                orgFilter === o.id ? 'bg-slate-900 text-white shadow-md' : 'bg-white border border-slate-200 text-slate-600 hover:border-slate-400'
              }\`}
            >
              {o.name} <span className="opacity-60 ml-1">{orgCounts[o.id]}</span>
            </button>
          ))}
        </div>

        {/* Ligne tri + per page */}
        <div className="flex items-center justify-between flex-wrap gap-2 pt-1 border-t border-slate-100">
          <div className="text-xs text-slate-500 pt-2">
            <span className="font-semibold">{filtered.length}</span> administrateur{filtered.length > 1 ? 's' : ''}
            {(search || orgFilter !== 'ALL') && (
              <button
                onClick={() => { setSearch(''); setOrgFilter('ALL'); }}
                className="ml-2 text-teal-600 hover:underline font-medium"
              >
                Effacer
              </button>
            )}
          </div>
          <div className="flex items-center gap-2 pt-2">
            <select
              value={sort}
              onChange={e => setSort(e.target.value as any)}
              className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 cursor-pointer"
            >
              <option value="role">Par role</option>
              <option value="name">Nom A-Z</option>
              <option value="org">Organisation</option>
              <option value="status">Statut</option>
            </select>
            <select
              value={perPage}
              onChange={e => setPerPage(parseInt(e.target.value))}
              className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 cursor-pointer"
            >
              <option value={12}>12 / page</option>
              <option value={24}>24 / page</option>
              <option value={48}>48 / page</option>
              <option value={96}>96 / page</option>
            </select>
          </div>
        </div>
      </div>`,
  "barre tri"
);

// 5. Utiliser pageItems au lieu de filtered
tryR(
  `          {filtered.map(a => {`,
  `          {pageItems.map(a => {`,
  "grille → pageItems"
);

// 6. Pagination avant ConfirmDialog
tryR(
  `      <ConfirmDialog
        open={!!adminToDelete}
        title="Supprimer l admin"`,
  `      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-1 py-3">
          <button
            onClick={() => setPage(Math.max(1, page - 1))}
            disabled={page === 1}
            className="px-3 h-9 rounded-lg bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed font-bold text-sm transition"
          >
            Precedent
          </button>
          <span className="px-4 text-sm font-bold text-slate-700">
            Page {page} / {totalPages}
          </span>
          <button
            onClick={() => setPage(Math.min(totalPages, page + 1))}
            disabled={page === totalPages}
            className="px-3 h-9 rounded-lg bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed font-bold text-sm transition"
          >
            Suivant
          </button>
        </div>
      )}

      <ConfirmDialog
        open={!!adminToDelete}
        title="Supprimer l admin"`,
  "pagination"
);

fs.writeFileSync(p, s);
console.log(`\nTotal : ${n}/6 patch(es) applique(s)`);
