const fs = require("fs");
const p = "app/dashboard/reservations/page.tsx";
let s = fs.readFileSync(p, "utf8");
let n = 0;
function tryR(old, neu, label) {
  if (!s.includes(old)) { console.warn(`  SKIP ${label}`); return false; }
  s = s.replace(old, neu); console.log(`  OK ${label}`); n++; return true;
}

console.log("Patches reservations pagination...");

// 1. Import hook + composant
tryR(
  `import { Modal, Button, Badge, PageHeader, FormField, Input, Select, Textarea } from '../../../components/ui';`,
  `import { Modal, Button, Badge, PageHeader, FormField, Input, Select, Textarea } from '../../../components/ui';
import { usePagination } from '../../../lib/usePagination';
import { Pagination } from '../../../lib/Pagination';`,
  "import hook"
);

// 2. Hook après totals (ligne ~144)
tryR(
  `  ), [filtered]);`,
  `  ), [filtered]);

  const pag = usePagination(filtered, { perPageDefault: 15 });

  // Reset page quand filtres / tri changent
  useEffect(() => {
    pag.setPage(1);
  }, [search, statusFilter, dateFrom, dateTo, sortKey, sortDir]);`,
  "hook + reset page"
);

// 3. filtered.map → pag.pageItems.map
tryR(
  `              {filtered.map((r) => {`,
  `              {pag.pageItems.map((r) => {`,
  "tbody → pageItems"
);

// 4. Pagination avant le Modal
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
console.log(`\nTotal : ${n}/4 patch(es)`);
