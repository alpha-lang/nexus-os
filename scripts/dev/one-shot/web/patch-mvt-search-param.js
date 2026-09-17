const fs = require('fs');
const p = 'app/dashboard/stock/movements/page.tsx';
let s = fs.readFileSync(p, 'utf8');

if (s.includes('useSearchParams')) {
  console.log('SKIP - deja present');
  process.exit(0);
}

// 1. Import useSearchParams
s = s.replace(
  "import { useState, useEffect, useMemo } from 'react';",
  "import { useState, useEffect, useMemo } from 'react';\nimport { useSearchParams } from 'next/navigation';"
);

// 2. State initial depuis le query param
const oldState = `  const [search, setSearch] = useState('');`;
const neuState = `  const searchParams = useSearchParams();
  const [search, setSearch] = useState(searchParams.get('search') || '');`;

if (!s.includes(oldState)) { console.error('❌ anchor state search introuvable'); process.exit(1); }
s = s.replace(oldState, neuState);

fs.writeFileSync(p, s);
console.log('✅ useSearchParams ajoute');
