const fs = require('fs');
const path = 'src/stock/stock.service.ts';
let s = fs.readFileSync(path, 'utf8');
const reports = fs.readFileSync('reports-backend.txt', 'utf8');

if (s.includes('getRotationReport')) {
  console.log('SKIP - methodes deja presentes');
  process.exit(0);
}

// Trouver la derniere methode : "async submitInventory"
const anchor = '  async submitInventory(user: any, data: any) {';
const idx = s.indexOf(anchor);

if (idx === -1) { console.error('❌ anchor submitInventory introuvable'); process.exit(1); }

s = s.slice(0, idx) + reports + s.slice(idx);

fs.writeFileSync(path, s);
console.log('✅ 3 methodes de rapports inserees');
