const fs = require('fs');
const p = 'app/dashboard/page.tsx';
let s = fs.readFileSync(p, 'utf8');

if (s.includes('stockDash')) {
  console.log('SKIP - deja present');
  process.exit(0);
}

// Ajouter state stock
s = s.replace(
  "  const [stats, setStats] = useState<any>(null);",
  "  const [stats, setStats] = useState<any>(null);\n  const [stockDash, setStockDash] = useState<any>(null);\n  const [stockMvts, setStockMvts] = useState<any[]>([]);"
);

// Charger stock si module actif
const oldFetch = `    fetch('/api/dashboard/stats', { headers: { Authorization: \`Bearer \${token}\` } })
      .then(r => r.json())
      .then(setStats)
      .catch(console.error)
      .finally(() => setLoading(false));`;

const newFetch = `    fetch('/api/dashboard/stats', { headers: { Authorization: \`Bearer \${token}\` } })
      .then(r => r.json())
      .then(setStats)
      .catch(console.error)
      .finally(() => setLoading(false));

    // Charger Stock uniquement si le module est actif
    const hasStock = JSON.parse(localStorage.getItem('activeModules') || '[]').some((m: any) => m.route === '/dashboard/stock');
    if (hasStock) {
      Promise.all([
        fetch('/api/stock/dashboard', { headers: { Authorization: \`Bearer \${token}\` } }).then(r => r.ok ? r.json() : null).catch(() => null),
        fetch('/api/stock/movements?limit=5', { headers: { Authorization: \`Bearer \${token}\` } }).then(r => r.ok ? r.json() : []).catch(() => []),
      ]).then(([d, m]) => {
        if (d) setStockDash(d);
        if (Array.isArray(m)) setStockMvts(m.slice(0, 5));
      });
    }`;

if (!s.includes(oldFetch)) { console.error('❌ anchor fetch introuvable'); process.exit(1); }
s = s.replace(oldFetch, newFetch);

fs.writeFileSync(p, s);
console.log('✅ state + fetch Stock ajoutes');
