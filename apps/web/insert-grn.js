const fs = require('fs');
const path = 'app/dashboard/stock/orders/[id]/page.tsx';
let s = fs.readFileSync(path, 'utf8');
const grn = fs.readFileSync('printGRN.txt', 'utf8');

if (s.includes('function printGRN')) {
  console.log('SKIP - printGRN deja present');
  process.exit(0);
}

// Trouver la fin de printPO : marqueur unique
const marker = 'setTimeout(() => win.print(), 400);\n  }';
const idx = s.indexOf(marker);
if (idx === -1) { console.error('❌ marker fin printPO introuvable'); process.exit(1); }

const insertAt = idx + marker.length;
s = s.slice(0, insertAt) + '\n\n' + grn + s.slice(insertAt);

fs.writeFileSync(path, s);
console.log('✅ printGRN insere apres printPO');
