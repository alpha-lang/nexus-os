const fs = require("fs");
const p = "app/dashboard/caisse/journal/page.tsx";
let s = fs.readFileSync(p, "utf8");
let n = 0;
function tryR(old, neu, label) {
  if (!s.includes(old)) { console.warn(`  MISS ${label}`); return false; }
  s = s.replace(old, neu); console.log(`  OK ${label}`); n++; return true;
}

console.log("Patch journal mouvements...");

// 1. Imports hook
if (!s.includes("usePagination")) {
  tryR(
    "import { useState, useEffect, useMemo } from 'react';",
    `import { useState, useEffect, useMemo } from 'react';
import { usePagination } from '../../../lib/usePagination';
import { Pagination } from '../../../lib/Pagination';`,
    "imports hook"
  );
}

// 2. States filtres mouvements
tryR(
  `  const [selectedRegister, setSelectedRegister] = useState<string>('');`,
  `  const [selectedRegister, setSelectedRegister] = useState<string>('');
  const [mvtPreset, setMvtPreset] = useState<'today' | 'week' | 'month' | 'all'>('week');
  const [mvtType, setMvtType] = useState<string>('ALL');`,
  "states filtres"
);

// 3. filteredMovements enrichi + hook
tryR(
  `  const filteredMovements = useMemo(() => {
    let list = movements;
    if (selectedRegister) list = list.filter((m) => m.registerId === selectedRegister);
    if (search) {
      const q = search.toLowerCase();
      list = list.filter((m) =>
        (m.reason || '').toLowerCase().includes(q) ||
        (m.reference || '').toLowerCase().includes(q) ||
        (m.register?.name || '').toLowerCase().includes(q)
      );
    }
    return list;
  }, [movements, selectedRegister, search]);`,
  `  const filteredMovements = useMemo(() => {
    let list = [...movements];

    if (selectedRegister) list = list.filter((m) => m.registerId === selectedRegister);

    // Preset date
    if (mvtPreset !== 'all') {
      const now = Date.now();
      const conf = mvtPreset === 'today' ? 86400000 : mvtPreset === 'week' ? 7 * 86400000 : 30 * 86400000;
      const from = now - conf;
      list = list.filter((m) => new Date(m.createdAt).getTime() >= from);
    }

    // Type
    if (mvtType === 'IN') list = list.filter((m) => ['SALE', 'IN', 'DEPOSIT', 'TRANSFER_IN'].includes(m.type));
    else if (mvtType === 'OUT') list = list.filter((m) => ['EXPENSE', 'OUT', 'WITHDRAWAL', 'TRANSFER_OUT'].includes(m.type));
    else if (mvtType !== 'ALL') list = list.filter((m) => m.type === mvtType);

    // Recherche
    if (search) {
      const q = search.toLowerCase();
      list = list.filter((m) =>
        (m.reason || '').toLowerCase().includes(q) ||
        (m.reference || '').toLowerCase().includes(q) ||
        (m.register?.name || '').toLowerCase().includes(q)
      );
    }

    // Tri : plus recent en premier
    list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return list;
  }, [movements, selectedRegister, search, mvtPreset, mvtType]);

  const pagMvt = usePagination(filteredMovements, { perPageDefault: 20 });

  useEffect(() => { pagMvt.setPage(1); }, [search, selectedRegister, mvtPreset, mvtType]);

  // Totaux de la periode filtree
  const mvtTotals = useMemo(() => {
    let inAmt = 0, outAmt = 0;
    filteredMovements.forEach((m) => {
      const isOut = ['OUT', 'EXPENSE', 'WITHDRAWAL', 'TRANSFER_OUT'].includes(m.type);
      if (isOut) outAmt += m.amount;
      else inAmt += m.amount;
    });
    return { inAmt, outAmt, net: inAmt - outAmt, count: filteredMovements.length };
  }, [filteredMovements]);`,
  "filtre + hook + totaux"
);

// 4. Remplacer filteredMovements.map par pagMvt.pageItems.map
tryR(
  `                {filteredMovements.map((m) => {`,
  `                {pagMvt.pageItems.map((m) => {`,
  "tableau → pageItems"
);

// 5. Empty state avec condition filtre
tryR(
  `                {filteredMovements.length === 0 && (
                  <tr><td colSpan={7} className="p-12 text-center text-slate-400 font-bold">Aucun mouvement</td></tr>
                )}`,
  `                {pagMvt.pageItems.length === 0 && (
                  <tr><td colSpan={7} className="p-12 text-center text-slate-400 font-bold">
                    {search || mvtType !== 'ALL' || mvtPreset !== 'all'
                      ? 'Aucun mouvement ne correspond aux filtres'
                      : 'Aucun mouvement'}
                  </td></tr>
                )}`,
  "empty state"
);

fs.writeFileSync(p, s);
console.log(`\nTotal : ${n}/5 patch(es)`);
