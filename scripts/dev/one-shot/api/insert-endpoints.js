const fs = require('fs');
const path = 'src/stock/stock.controller.ts';
let s = fs.readFileSync(path, 'utf8');
const endpoints = fs.readFileSync('reports-endpoints.txt', 'utf8');

if (s.includes('reports/rotation')) {
  console.log('SKIP - endpoints deja presents');
  process.exit(0);
}

const anchor = '  // INVENTORY';
if (!s.includes(anchor)) { console.error('❌ anchor // INVENTORY introuvable'); process.exit(1); }

s = s.replace(anchor, endpoints + anchor);
fs.writeFileSync(path, s);
console.log('✅ 3 endpoints ajoutes');
