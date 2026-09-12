const fs = require("fs");
const p = "app/dashboard/caisse/journal/page.tsx";
let lines = fs.readFileSync(p, "utf8").split("\n");

// Skip si deja fait
if (lines.some(l => l.trim() === "{tab === 'movements' && (" && lines[lines.indexOf(l) + 1] && lines[lines.indexOf(l) + 1].trim() === "<>")) {
  console.log("SKIP deja present");
  process.exit(0);
}

// 1. Trouve la ligne `{tab === 'movements' && (`
const startIdx = lines.findIndex(l => l.trim() === "{tab === 'movements' && (");
if (startIdx === -1) { console.error("❌ start introuvable"); process.exit(1); }
console.log(`start ligne ${startIdx + 1}: ${lines[startIdx].trim()}`);

// 2. Insère `<>` juste après
lines.splice(startIdx + 1, 0, "        <>");

// 3. Trouve la ligne `<Pagination` apres startIdx (maintenant startIdx+2)
const pagIdx = lines.findIndex((l, i) => i > startIdx + 1 && l.trim() === "<Pagination");
if (pagIdx === -1) { console.error("❌ <Pagination> introuvable"); process.exit(1); }
console.log(`Pagination ligne ${pagIdx + 1}`);

// 4. Trouve le `)}` qui ferme le bloc (apres Pagination)
let endIdx = -1;
for (let i = pagIdx; i < lines.length; i++) {
  if (lines[i].trim() === ")}") { endIdx = i; break; }
}
if (endIdx === -1) { console.error("❌ )} introuvable"); process.exit(1); }
console.log(`fin ligne ${endIdx + 1}`);

// 5. Insère `</>` avant endIdx
lines.splice(endIdx, 0, "        </>");

fs.writeFileSync(p, lines.join("\n"));
console.log("✅ fragment <> </> ajoute");
