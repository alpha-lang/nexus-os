const fs = require("fs");
const p = "prisma/schema.prisma";
let s = fs.readFileSync(p, "utf8");
let n = 0;
function tryR(old, neu, label) {
  if (s.includes(neu.split("\n")[1]?.trim()) && neu.split("\n")[1]?.includes("stockWarehouses")) {
    console.log(`  SKIP ${label} (deja present)`); return false;
  }
  if (!s.includes(old)) { console.warn(`  MISS ${label}`); return false; }
  s = s.replace(old, neu); console.log(`  OK ${label}`); n++; return true;
}

console.log("Patch back-relations 2...");

// 1. Organization : id sans padding + relations
tryR(
  `model Organization {
  id          String   @id @default(cuid())
  name        String`,
  `model Organization {
  id              String           @id @default(cuid())
  name            String
  stockWarehouses StockWarehouse[]
  stockSuppliers  StockSupplier[]
  stockItems      StockItem[]
  stockMovements  StockMovement[]
  recipes         Recipe[]`,
  "Organization back-relations"
);

// 2. User : ajouter stockMovements apres isOwner
tryR(
  `  isActive       Boolean          @default(true)
  isOwner        Boolean          @default(false)`,
  `  isActive       Boolean          @default(true)
  isOwner        Boolean          @default(false)
  stockMovements StockMovement[]`,
  "User back-relations"
);

fs.writeFileSync(p, s);
console.log(`\nTotal : ${n}/2 patch(es)`);
