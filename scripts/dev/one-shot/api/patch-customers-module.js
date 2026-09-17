const fs = require('fs');
const p = 'src/customers/customers.module.ts';
let s = fs.readFileSync(p, 'utf8');

if (s.includes('PartnersController')) { console.log('SKIP'); process.exit(0); }

s = s.replace(
  `import { CustomersController } from './customers.controller';`,
  `import { CustomersController } from './customers.controller';
import { PartnersController } from '../partners/partners.controller';`
);

s = s.replace(
  `controllers: [CustomersController],`,
  `controllers: [CustomersController, PartnersController],`
);

fs.writeFileSync(p, s);
console.log('✅ PartnersController enregistre');
