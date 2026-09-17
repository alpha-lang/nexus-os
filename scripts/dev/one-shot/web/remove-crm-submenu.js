const fs = require('fs');
const p = 'app/dashboard/layout.tsx';
let s = fs.readFileSync(p, 'utf8');

// Trouver le début et la fin du bloc CRM
const startMarker = `    '/dashboard/crm': [`;
const endMarker = `    '/dashboard/stock': [`;

const startIdx = s.indexOf(startMarker);
if (startIdx === -1) {
  console.log('SKIP - pas de sous-menu CRM a retirer');
  process.exit(0);
}

const endIdx = s.indexOf(endMarker, startIdx);
if (endIdx === -1) {
  console.error('❌ fin bloc CRM introuvable');
  process.exit(1);
}

// Supprimer tout le bloc CRM (garder stock)
s = s.slice(0, startIdx) + s.slice(endIdx);

fs.writeFileSync(p, s);
console.log('✅ Sous-menu CRM supprime (retour a item simple)');
