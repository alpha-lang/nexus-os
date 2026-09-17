const fs = require('fs');
const p = 'prisma/schema.prisma';
let s = fs.readFileSync(p, 'utf8');

if (s.includes('binaryTargets')) {
  console.log('SKIP - deja present');
  process.exit(0);
}

const old = `generator client {
  provider = "prisma-client-js"
}`;

const neu = `generator client {
  provider      = "prisma-client-js"
  binaryTargets = ["native", "rhel-openssl-3.0.x"]
}`;

if (!s.includes(old)) { console.error('❌ anchor introuvable'); process.exit(1); }
s = s.replace(old, neu);
fs.writeFileSync(p, s);
console.log('✅ binaryTargets ajoute pour Vercel');
