const fs = require("fs");
const p = "app/dashboard/layout.tsx";
let s = fs.readFileSync(p, "utf8");

if (s.includes("'/dashboard/stock/orders'")) {
  console.log("SKIP - deja present");
  process.exit(0);
}

const old = `      {
        path: '/dashboard/stock/inventory',
        label: 'Inventaire',`;

const neu = `      {
        path: '/dashboard/stock/orders',
        label: 'Commandes',
        icon: (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
          </svg>
        ),
      },
      {
        path: '/dashboard/stock/inventory',
        label: 'Inventaire',`;

if (!s.includes(old)) { console.error("❌ anchor introuvable"); process.exit(1); }
s = s.replace(old, neu);
fs.writeFileSync(p, s);
console.log("✅ Commandes ajoute au sous-menu stock");
