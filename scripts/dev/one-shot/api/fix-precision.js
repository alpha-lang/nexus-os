const fs = require("fs");
const p = "src/storage/storage.service.ts";
let s = fs.readFileSync(p, "utf8");
let changes = 0;

// recalcAll : stocker bytes/1048576 (non arrondi)
const oldRecalc = `data: { usedStorage: r.mo },`;
const newRecalc = `data: { usedStorage: r.bytes / (1024 * 1024) },`;
if (s.includes(oldRecalc)) {
  s = s.split(oldRecalc).join(newRecalc);
  changes++;
}

// upsert : create aussi
const oldUpsert = `create: {
            organizationId: o.id,
            usedStorage: r.mo,
            maxStorage: o.name.includes('CORP') ? 10000 : 500,
          },`;
const newUpsert = `create: {
            organizationId: o.id,
            usedStorage: r.bytes / (1024 * 1024),
            maxStorage: o.name.includes('CORP') ? 10000 : 500,
          },`;
if (s.includes(oldUpsert)) {
  s = s.replace(oldUpsert, newUpsert);
  changes++;
}

// recordBackup : stocker bytes non arrondi
const oldBk = `usedStorage: realSize.mo,`;
const newBk = `usedStorage: realSize.bytes / (1024 * 1024),`;
if (s.includes(oldBk)) {
  s = s.split(oldBk).join(newBk);
  changes++;
}

fs.writeFileSync(p, s);
console.log(`✅ ${changes} remplacement(s) precision`);
