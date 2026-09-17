const fs = require('fs');
const p = 'app/dashboard/page.tsx';
let s = fs.readFileSync(p, 'utf8');

// Supprimer le )} orphelin ligne 730 : 
// Pattern : "      )}\n\n      )}\n\n      {/* ═══ COMMERCE ═══ */}"
const old = `      )}

      )}

      {/* ═══ COMMERCE ═══ */}`;
const neu = `      )}

      {/* ═══ COMMERCE ═══ */}`;

if (!s.includes(old)) { console.error('❌ anchor introuvable'); process.exit(1); }
s = s.replace(old, neu);
fs.writeFileSync(p, s);
console.log('✅ )} orphelin supprime');
