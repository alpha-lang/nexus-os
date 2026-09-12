const fs = require('fs');
const p = 'app/dashboard/stock/orders/page.tsx';
let s = fs.readFileSync(p, 'utf8');

if (s.includes('useSearchParams')) {
  console.log('SKIP - deja patche');
  process.exit(0);
}

// 1. Import
s = s.replace(
  `import { useState, useEffect, useMemo } from 'react';`,
  `import { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';`
);

// 2. Lire le query param
s = s.replace(
  `  const [supplierId, setSupplierId] = useState('');`,
  `  const searchParams = useSearchParams();
  const supplierFromUrl = searchParams.get('supplierId') || '';
  const [supplierId, setSupplierId] = useState(supplierFromUrl);`
);

fs.writeFileSync(p, s);
console.log('✅ Orders lit ?supplierId=');
