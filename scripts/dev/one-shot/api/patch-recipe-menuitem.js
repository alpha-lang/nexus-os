const fs = require("fs");
const p = "prisma/schema.prisma";
let s = fs.readFileSync(p, "utf8");
let n = 0;
function tryR(old, neu, label) {
  if (!s.includes(old)) { console.warn(`  MISS ${label}`); return false; }
  s = s.replace(old, neu); console.log(`  OK ${label}`); n++; return true;
}

console.log("Patch Recipe.menuItemId...");

// 1. Ajouter menuItemId dans Recipe
tryR(
  `model Recipe {
  id             String             @id @default(cuid())
  name           String
  catalogItemId  String?
  catalogItem    CatalogItem?       @relation(fields: [catalogItemId], references: [id])`,
  `model Recipe {
  id             String             @id @default(cuid())
  name           String
  catalogItemId  String?
  catalogItem    CatalogItem?       @relation(fields: [catalogItemId], references: [id])
  menuItemId     String?
  menuItem       MenuItem?          @relation(fields: [menuItemId], references: [id])`,
  "Recipe.menuItemId"
);

// 2. Back-relation sur MenuItem
tryR(
  `model MenuItem {
  id             String                @id @default(cuid())
  name           String`,
  `model MenuItem {
  id             String                @id @default(cuid())
  name           String
  recipes        Recipe[]`,
  "MenuItem.recipes back-relation"
);

fs.writeFileSync(p, s);
console.log(`\nTotal : ${n}/2 patch(es)`);
