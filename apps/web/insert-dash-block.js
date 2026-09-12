const fs = require('fs');
const p = 'app/dashboard/page.tsx';
let s = fs.readFileSync(p, 'utf8');
const block = fs.readFileSync('dash-stock-block.txt', 'utf8');

if (s.includes('Articles critiques') && s.includes('Derniers mouvements')) {
  console.log('SKIP - bloc deja present');
  process.exit(0);
}

// Trouver la fin de la section Hotel (avant {/* ═══ COMMERCE ═══ */})
const anchor = `      {/* ═══ COMMERCE ═══ */}`;
const idx = s.indexOf(anchor);

if (idx === -1) { console.error('❌ anchor COMMERCE introuvable'); process.exit(1); }

// Chercher la fermeture de {isHotel && ( juste avant
// On insère le bloc AVANT le `)}` qui ferme isHotel
const beforeAnchor = s.slice(0, idx);
const lastClose = beforeAnchor.lastIndexOf('      )}');
if (lastClose === -1) { console.error('❌ fin isHotel introuvable'); process.exit(1); }

s = s.slice(0, lastClose) + block + '\n      )}\n\n' + s.slice(idx);

// Ajouter activeModules dans localStorage (dans le useEffect auth/me)
if (!s.includes("localStorage.setItem('activeModules'")) {
  s = s.replace(
    "        localStorage.setItem('orgName', data.organization?.name || '');",
    "        localStorage.setItem('orgName', data.organization?.name || '');\n        localStorage.setItem('activeModules', JSON.stringify(data.modules || []));"
  );
  console.log('  + activeModules sauvegarde');
}

fs.writeFileSync(p, s);
console.log('✅ Bloc Stock insere dans dashboard Hotel');
