const fs = require('fs');
const p = 'app/dashboard/page.tsx';
let s = fs.readFileSync(p, 'utf8');

// Supprimer le )} orphelin : 3 lignes vides + )} + 3 lignes vides → 3 lignes vides
const old = `      )}

      )}

      {/* ═══ COMMERCE ═══ */}`;
const neu = `      )}

      {/* ═══ COMMERCE ═══ */}`;

if (s.includes(old)) {
  s = s.replace(old, neu);
  fs.writeFileSync(p, s);
  console.log('✅ )} en trop supprime');
} else {
  // Alternative : chercher avec différents retours ligne
  const lines = s.split('\n');
  for (let i = 720; i < 740; i++) {
    if (lines[i] && lines[i].trim() === ')}' && lines[i+2] && lines[i+2].trim() === ')}') {
      lines.splice(i+2, 2);
      fs.writeFileSync(p, lines.join('\n'));
      console.log('✅ )} en trop supprime (ligne ' + (i+3) + ')');
      process.exit(0);
    }
  }
  console.error('❌ introuvable - verifier manuellement');
  process.exit(1);
}
