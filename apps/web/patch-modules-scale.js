const fs = require("fs");
const p = "app/dashboard/modules/page.tsx";
let s = fs.readFileSync(p, "utf8");
let n = 0;
function tryR(old, neu, label) {
  if (!s.includes(old)) { console.warn(`  SKIP ${label}`); return false; }
  s = s.replace(old, neu); console.log(`  OK ${label}`); n++; return true;
}

console.log("Patches modules scaling...");

// ─── 1. Fix bandeau gradient : couleur solide au lieu de gradient fade ───
tryR(
  `<div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 rounded-2xl p-5 text-white shadow-lg">`,
  `<div className="bg-slate-900 rounded-2xl p-5 text-white shadow-lg">`,
  "bandeau couleur solide"
);

// ─── 2. State pagination + tri ───
tryR(
  `const [filterTarget, setFilterTarget] = useState<string>('ALL');`,
  `const [filterTarget, setFilterTarget] = useState<string>('ALL');
  const [sort, setSort] = useState<'price-desc' | 'price-asc' | 'name'>('price-desc');
  const [perPage, setPerPage] = useState(12);
  const [page, setPage] = useState(1);`,
  "state pagination + tri"
);

// ─── 3. Reset page quand filtres changent ───
tryR(
  `useEffect(() => {
    load().catch(console.error).finally(() => setLoading(false));
    const closeMenu = () => setOpenMenu(null);
    document.addEventListener('click', closeMenu);
    return () => document.removeEventListener('click', closeMenu);
  }, []);`,
  `useEffect(() => {
    load().catch(console.error).finally(() => setLoading(false));
    const closeMenu = () => setOpenMenu(null);
    document.addEventListener('click', closeMenu);
    return () => document.removeEventListener('click', closeMenu);
  }, []);

  useEffect(() => { setPage(1); }, [search, filterTarget, sort, perPage]);`,
  "reset page sur filtre"
);

// ─── 4. Tri dans filtered + ajout de sort ───
tryR(
  `    return list.sort((a, b) => (b.price || 0) - (a.price || 0));
  }, [modules, filterTarget, search]);`,
  `    list.sort((a, b) => {
      if (sort === 'name') return (a.name || '').localeCompare(b.name || '');
      if (sort === 'price-asc') return (a.price || 0) - (b.price || 0);
      return (b.price || 0) - (a.price || 0);
    });
    return list;
  }, [modules, filterTarget, search, sort]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / perPage));
  const pageItems = filtered.slice((page - 1) * perPage, page * perPage);`,
  "tri + pagination slices"
);

// ─── 5. Remplacer filtered par pageItems dans la grille ───
tryR(
  `{filtered.map(m => {`,
  `{pageItems.map(m => {`,
  "grille → pageItems"
);

// ─── 6. Ajouter select tri + per page dans la barre de filtres ───
tryR(
  `          {AVAILABLE_TYPES.map(t => (
            <button
              key={t}
              onClick={() => setFilterTarget(t)}
              className={\`px-3.5 py-1.5 rounded-xl text-xs font-bold transition \${
                filterTarget === t
                  ? 'bg-slate-900 text-white shadow-md'
                  : 'bg-white border border-slate-200 text-slate-700 hover:border-slate-400'
              }\`}
            >
              {t} <span className="opacity-60 ml-1">{counts[t] || 0}</span>
            </button>
          ))}
        </div>
      </div>`,
  `          {AVAILABLE_TYPES.map(t => (
            <button
              key={t}
              onClick={() => setFilterTarget(t)}
              className={\`px-3.5 py-1.5 rounded-xl text-xs font-bold transition \${
                filterTarget === t
                  ? 'bg-slate-900 text-white shadow-md'
                  : 'bg-white border border-slate-200 text-slate-700 hover:border-slate-400'
              }\`}
            >
              {t} <span className="opacity-60 ml-1">{counts[t] || 0}</span>
            </button>
          ))}
        </div>

        {/* Ligne tri + per page */}
        <div className="flex items-center justify-between flex-wrap gap-2 pt-1">
          <div className="text-xs text-slate-500">
            <span className="font-semibold">{filtered.length}</span> module{filtered.length > 1 ? 's' : ''}
            {(search || filterTarget !== 'ALL') && (
              <button
                onClick={() => { setSearch(''); setFilterTarget('ALL'); }}
                className="ml-2 text-teal-600 hover:underline font-medium"
              >
                Effacer
              </button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <select
              value={sort}
              onChange={e => setSort(e.target.value as any)}
              className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 cursor-pointer"
            >
              <option value="price-desc">Prix decroissant</option>
              <option value="price-asc">Prix croissant</option>
              <option value="name">Nom A-Z</option>
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
  "toolbar tri + per page"
);

// ─── 7. Pagination avant fermeture du composant principal ───
tryR(
  `      <ConfirmDialog
        open={!!moduleToDelete}
        title="Supprimer le module"`,
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
        open={!!moduleToDelete}
        title="Supprimer le module"`,
  "pagination"
);

fs.writeFileSync(p, s);
console.log(`\nTotal : ${n}/7 patch(es) applique(s)`);
