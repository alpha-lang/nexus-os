const fs = require('fs');
const p = 'app/dashboard/page.tsx';
let s = fs.readFileSync(p, 'utf8');

// Trouver le bloc {isHotel && stockDash && (...)} complet
const startMarker = '      {isHotel && stockDash && (';
const endMarker = '\n      {/* ═══ COMMERCE ═══ */}';

const startIdx = s.indexOf(startMarker);
if (startIdx === -1) { console.error('❌ bloc stock introuvable'); process.exit(1); }

const endIdx = s.indexOf(endMarker, startIdx);
if (endIdx === -1) { console.error('❌ marqueur COMMERCE introuvable'); process.exit(1); }

// Supprimer tout le bloc entre les 2
s = s.slice(0, startIdx) + s.slice(endIdx + 1);

fs.writeFileSync(p, s);
console.log('✅ Bloc Stock complet supprime');
