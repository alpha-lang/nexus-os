const fs = require('fs');
const p = 'app/dashboard/page.tsx';
let s = fs.readFileSync(p, 'utf8');

// 1. Localiser le widget Stock (bloc complet)
const startMarker = '      {isHotel && stockDash && (';
const startIdx = s.indexOf(startMarker);
if (startIdx === -1) { console.error('❌ widget introuvable'); process.exit(1); }

// Trouver la fin du widget : chercher la prochaine occurrence de "{/* ═══ COMMERCE ═══ */}"
const endMarker = '      {/* ═══ COMMERCE ═══ */}';
const endIdx = s.indexOf(endMarker, startIdx);
if (endIdx === -1) { console.error('❌ fin widget introuvable'); process.exit(1); }

const widget = s.slice(startIdx, endIdx);

// 2. Supprimer le widget de sa position actuelle
s = s.slice(0, startIdx) + s.slice(endIdx);

// 3. Trouver l'anchor : le bloc "Taux d'occupation" dans la section hôtel
// On cherche "<div className=\"grid grid-cols-1 lg:grid-cols-3 gap-4\">" qui précède Taux d'occupation
const anchor = `          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 p-4">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h3 className="font-black text-slate-900 text-base">Taux d occupation</h3>`;

const anchorIdx = s.indexOf(anchor);
if (anchorIdx === -1) { console.error('❌ anchor Taux occupation introuvable'); process.exit(1); }

// 4. Insérer le widget juste avant ce bloc
s = s.slice(0, anchorIdx) + widget + '\n' + s.slice(anchorIdx);

fs.writeFileSync(p, s);
console.log('✅ Widget Stock deplace apres les 4 KPI');
