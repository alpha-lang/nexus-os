const fs = require('fs');
const p = 'src/app.module.ts';
let s = fs.readFileSync(p, 'utf8');
if (s.includes('PartnersController')) { console.log('SKIP'); process.exit(0); }
// PartnersController est dans CustomersModule
console.log('Partners sera ajoute dans CustomersModule');
