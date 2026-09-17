const fs = require('fs');
const p = 'app/dashboard/page.tsx';
let s = fs.readFileSync(p, 'utf8');

const old = `    // Charger Stock uniquement si le module est actif
    const hasStock = JSON.parse(localStorage.getItem('activeModules') || '[]').some((m: any) => m.route === '/dashboard/stock');
    if (hasStock) {`;

const neu = `    // Charger Stock uniquement si le module est actif (via /auth/me)
    fetch('/api/auth/me', { headers: { Authorization: \`Bearer \${token}\` } })
      .then(r => r.ok ? r.json() : null)
      .catch(() => null)
      .then(me => {
        const hasStock = (me?.modules || []).some((m: any) => m.route === '/dashboard/stock');
        if (!hasStock) return;
        Promise.all([
          fetch('/api/stock/dashboard', { headers: { Authorization: \`Bearer \${token}\` } }).then(r => r.ok ? r.json() : null).catch(() => null),
          fetch('/api/stock/movements?limit=5', { headers: { Authorization: \`Bearer \${token}\` } }).then(r => r.ok ? r.json() : []).catch(() => []),
        ]).then(([d, m]) => {
          if (d) setStockDash(d);
          if (Array.isArray(m)) setStockMvts(m.slice(0, 5));
        });
      });

    // Bloc original neutralise (garde structure)
    if (false) {`;

if (!s.includes(old)) { console.error('❌ anchor introuvable'); process.exit(1); }
s = s.replace(old, neu);
fs.writeFileSync(p, s);
console.log('✅ hasStock lit depuis /auth/me');
