const fs = require("fs");
const p = "prisma/schema.prisma";
let s = fs.readFileSync(p, "utf8");

if (s.includes("pricing        Json?")) {
  console.log("SKIP deja present");
  process.exit(0);
}

const old = `  price          Float        @default(0)
  status         String       @default("ACTIVE")`;

const neu = `  price          Float        @default(0)
  pricing        Json?
  status         String       @default("ACTIVE")`;

if (!s.includes(old)) { console.error("❌ anchor introuvable"); process.exit(1); }
s = s.replace(old, neu);
fs.writeFileSync(p, s);
console.log("✅ pricing Json ajoute a Module");
