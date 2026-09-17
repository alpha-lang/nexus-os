const fs = require("fs");
const p = "app/dashboard/caisse/folios/page.tsx";
let s = fs.readFileSync(p, "utf8");
let n = 0;
function tryR(old, neu, label) {
  if (!s.includes(old)) { console.warn(`  MISS ${label}`); return false; }
  s = s.replace(old, neu); console.log(`  OK ${label}`); n++; return true;
}

console.log("Patch folios urgence...");

// 1. Ajouter filtre "DUE_TODAY" et "DUE_WEEK"
tryR(
  `  const [filter, setFilter] = useState<'ALL' | 'DUE' | 'PAID'>('ALL');`,
  `  const [filter, setFilter] = useState<'ALL' | 'DUE' | 'PAID' | 'DUE_TODAY' | 'DUE_WEEK'>('ALL');`,
  "state filter elargi"
);

// 2. Fonction utilitaire pour calculer urgence
tryR(
  `  const filteredFolios = folios`,
  `  function daysUntil(dateStr: string): number {
    const d = new Date(dateStr);
    d.setHours(0, 0, 0, 0);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return Math.round((d.getTime() - today.getTime()) / 86400000);
  }

  function urgencyMeta(days: number, solde: number) {
    if (solde <= 0) return { key: 'paid', label: 'A JOUR', color: 'bg-emerald-500', text: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-300' };
    if (days < 0) return { key: 'overdue', label: 'DEPASSE', color: 'bg-red-600', text: 'text-red-700', bg: 'bg-red-50', border: 'border-red-400' };
    if (days === 0) return { key: 'today', label: "PART AUJOURD HUI", color: 'bg-red-500', text: 'text-red-700', bg: 'bg-red-50', border: 'border-red-300' };
    if (days <= 3) return { key: 'soon', label: \`DANS \${days}J\`, color: 'bg-amber-500', text: 'text-amber-700', bg: 'bg-amber-50', border: 'border-amber-300' };
    return { key: 'later', label: \`DANS \${days}J\`, color: 'bg-slate-400', text: 'text-slate-600', bg: 'bg-slate-50', border: 'border-slate-200' };
  }

  const filteredFolios = folios`,
  "helpers urgence"
);

// 3. Filtrer par DUE_TODAY / DUE_WEEK
tryR(
  `  const filteredFolios = folios
    .filter((f) => {`,
  `  const filteredFolios = folios
    .filter((f) => {
      // Filtres urgence
      if (filter === 'DUE_TODAY') {
        const d = daysUntil(f.checkOutDate);
        if (d > 0 || f.solde <= 0) return false;
      }
      if (filter === 'DUE_WEEK') {
        const d = daysUntil(f.checkOutDate);
        if (d > 7 || f.solde <= 0) return false;
      }
`,
  "filtres urgence"
);

// 4. Ajouter un tri par urgence
tryR(
  `  const [sortBy, setSortBy] = useState<'ROOM' | 'DUE' | 'CHECKOUT'>('ROOM');`,
  `  const [sortBy, setSortBy] = useState<'ROOM' | 'DUE' | 'CHECKOUT' | 'URGENCY'>('URGENCY');`,
  "sort urgence"
);

tryR(
  `      if (sortBy === 'ROOM') return String(a.room?.number || '').localeCompare(String(b.room?.number || ''), undefined, { numeric: true });`,
  `      if (sortBy === 'URGENCY') {
        const da = daysUntil(a.checkOutDate);
        const db = daysUntil(b.checkOutDate);
        // D'abord les impayés, puis par urgence
        if ((a.solde > 0) !== (b.solde > 0)) return (b.solde > 0 ? 1 : 0) - (a.solde > 0 ? 1 : 0);
        return da - db;
      }
      if (sortBy === 'ROOM') return String(a.room?.number || '').localeCompare(String(b.room?.number || ''), undefined, { numeric: true });`,
  "tri urgence"
);

// 5. Enrichir les chips de filtre avec DUE_TODAY / DUE_WEEK
tryR(
  `            { v: 'DUE' as const, l: 'À payer', c: stats.due },
              { v: 'PAID' as const, l: 'À jour', c: stats.paid },`,
  `            { v: 'DUE' as const, l: 'À payer', c: stats.due },
              { v: 'DUE_TODAY' as const, l: "Partent aujourd hui", c: folios.filter(f => f.solde > 0 && daysUntil(f.checkOutDate) === 0).length },
              { v: 'DUE_WEEK' as const, l: 'Cette semaine', c: folios.filter(f => f.solde > 0 && daysUntil(f.checkOutDate) > 0 && daysUntil(f.checkOutDate) <= 7).length },
              { v: 'PAID' as const, l: 'À jour', c: stats.paid },`,
  "chips urgence"
);

fs.writeFileSync(p, s);
console.log(`\nTotal : ${n}/5 patch(es)`);
