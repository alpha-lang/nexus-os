const fs = require('fs');
const p = 'app/dashboard/clients/[id]/page.tsx';
let s = fs.readFileSync(p, 'utf8');
let n = 0;
function tryR(old, neu, label) {
  if (!s.includes(old)) { console.warn(`  MISS ${label}`); return false; }
  s = s.replace(old, neu); console.log(`  OK ${label}`); n++; return true;
}

console.log('Patch client detail...');

// 1. Ajouter helper parseTags apres PREDEFINED_TAGS
tryR(
  `function getTagMeta(tagId: string) {`,
  `function parseTags(csv: string | null | undefined): string[] {
  if (!csv) return [];
  return csv.split(',').map((t) => t.trim()).filter(Boolean);
}

function getTagMeta(tagId: string) {`,
  'helper parseTags'
);

// 2. currentTags : array → parseTags
tryR(
  `const currentTags = customer.tags || [];`,
  `const currentTags = parseTags(customer.tags);`,
  'currentTags'
);

// 3. customer.notes → customer.customerNotes (3 occurrences)
tryR(
  `📝 Notes ({customer.notes?.length || 0})`,
  `📝 Notes ({customer.customerNotes?.length || 0})`,
  'notes count'
);

tryR(
  `{customer.notes?.map((note: any) => (`,
  `{customer.customerNotes?.map((note: any) => (`,
  'notes map'
);

tryR(
  `{(!customer.notes || customer.notes.length === 0) && (`,
  `{(!customer.customerNotes || customer.customerNotes.length === 0) && (`,
  'notes empty'
);

fs.writeFileSync(p, s);
console.log(`\n✅ ${n}/4 patch(es)`);
