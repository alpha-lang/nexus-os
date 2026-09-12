const fs = require("fs");
const p = "app/dashboard/reservations/chambres/page.tsx";
let s = fs.readFileSync(p, "utf8");

if (s.includes("const pagRooms = usePagination")) {
  console.log("SKIP - hook deja present");
  process.exit(0);
}

// Trouve la 1ère occurrence de "if (loading)" dans le code (pas dans un commentaire)
const lines = s.split('\n');
let targetIdx = -1;
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes("if (loading)") && !lines[i].includes("//")) {
    targetIdx = i;
    break;
  }
}

if (targetIdx === -1) {
  console.error("❌ pas de 'if (loading)' trouve");
  process.exit(1);
}

console.log(`Insertion avant ligne ${targetIdx + 1}:`);
console.log(`  ${lines[targetIdx].trim()}`);

const insertion = [
  "  const filteredRooms = rooms.filter(r => {",
  "    if (filterStatus !== 'ALL' && r.status !== filterStatus) return false;",
  "    if (filterType !== 'ALL' && r.roomTypeId !== filterType) return false;",
  "    if (search.trim()) {",
  "      const q = search.toLowerCase();",
  "      const hay = `${r.number} ${r.roomType?.name || ''} ${r.notes || ''}`.toLowerCase();",
  "      if (!hay.includes(q)) return false;",
  "    }",
  "    return true;",
  "  }).sort((a, b) => {",
  "    if (sort === 'floor') return (a.floor || 0) - (b.floor || 0);",
  "    if (sort === 'status') return (a.status || '').localeCompare(b.status || '');",
  "    return String(a.number).localeCompare(String(b.number), undefined, { numeric: true });",
  "  });",
  "",
  "  const pagRooms = usePagination(filteredRooms, { perPageDefault: 15 });",
  "",
  lines[targetIdx]
];

lines.splice(targetIdx, 1, ...insertion);
s = lines.join('\n');
fs.writeFileSync(p, s);
console.log("✅ filteredRooms + pagRooms inseres");
