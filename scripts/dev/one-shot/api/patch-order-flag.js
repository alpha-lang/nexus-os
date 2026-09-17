const fs = require("fs");
const p = "prisma/schema.prisma";
let s = fs.readFileSync(p, "utf8");

if (s.includes("stockConsumed")) {
  console.log("SKIP deja present");
  process.exit(0);
}

const old = `model RestaurantOrder {
  id             String                @id @default(cuid())`;

const neu = `model RestaurantOrder {
  id             String                @id @default(cuid())
  stockConsumed  Boolean               @default(false)`;

if (!s.includes(old)) { console.error("❌ anchor introuvable"); process.exit(1); }
s = s.replace(old, neu);
fs.writeFileSync(p, s);
console.log("✅ stockConsumed ajoute");
