const fs = require('fs');
const p = 'app/dashboard/layout.tsx';
let s = fs.readFileSync(p, 'utf8');

if (s.includes("'/dashboard/stock/reports'")) {
  console.log('SKIP - deja present');
  process.exit(0);
}

const anchor = `      {
        path: '/dashboard/stock/inventory',
        label: 'Inventaire',`;

const neu = `      {
        path: '/dashboard/stock/reports',
        label: 'Rapports',
        icon: (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
        ),
      },
      {
        path: '/dashboard/stock/inventory',
        label: 'Inventaire',`;

if (!s.includes(anchor)) { console.error('❌ anchor introuvable'); process.exit(1); }
s = s.replace(anchor, neu);
fs.writeFileSync(p, s);
console.log('✅ Rapports ajoute au sous-menu');
