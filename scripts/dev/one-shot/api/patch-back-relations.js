const fs = require("fs");
const p = "prisma/schema.prisma";
let s = fs.readFileSync(p, "utf8");
let n = 0;
function tryR(old, neu, label) {
  if (!s.includes(old)) { console.warn(`  MISS ${label}`); return false; }
  s = s.replace(old, neu); console.log(`  OK ${label}`); n++; return true;
}

console.log("Patch back-relations...");

// 1. Organization : ajouter les 5 back-relations
tryR(
  `model Organization {
  id             String         @id @default(cuid())`,
  `model Organization {
  id             String         @id @default(cuid())
  stockWarehouses StockWarehouse[]
  stockSuppliers  StockSupplier[]
  stockItems      StockItem[]
  stockMovements  StockMovement[]
  recipes         Recipe[]`,
  "Organization back-relations"
);

// 2. CatalogItem : ajouter stockItems + recipes
tryR(
  `  saleRecords    Sale[]
}`,
  `  saleRecords    Sale[]
  stockItems     StockItem[]
  recipes        Recipe[]
}`,
  "CatalogItem back-relations"
);

// 3. User : ajouter stockMovements
tryR(
  `model User {
  id             String         @id @default(cuid())`,
  `model User {
  id             String         @id @default(cuid())
  stockMovements StockMovement[]`,
  "User back-relations"
);

fs.writeFileSync(p, s);
console.log(`\nTotal : ${n}/3 patch(es)`);
