const fs = require('fs');
const p = 'app/dashboard/layout.tsx';
let s = fs.readFileSync(p, 'utf8');

// Trouver la ligne isExpanded
const old = `            const isExpanded = expandedModule === item.path;`;

const neu = `            const isExpanded = expandedModule === item.path || (item.path !== '/dashboard' && pathname.startsWith(item.path + '/'));`;

if (!s.includes(old)) { console.error('❌ anchor isExpanded introuvable'); process.exit(1); }
s = s.replace(old, neu);

fs.writeFileSync(p, s);
console.log('✅ Auto-expand sur enfant actif');
