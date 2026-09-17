const fs = require('fs');
const p = 'app/dashboard/page.tsx';
let s = fs.readFileSync(p, 'utf8');
let n = 0;

// 1. Insérer )} entre </> et {isHotel && stockDash
const old1 = `        </>
      {isHotel && stockDash && (`;
const new1 = `        </>
      )}

      {isHotel && stockDash && (`;

if (!s.includes(old1)) { console.error('❌ anchor 1 introuvable'); process.exit(1); }
s = s.replace(old1, new1);
n++;
console.log('  OK fermeture isHotel avant le bloc');

// 2. Supprimer le )} en trop après mon bloc (avant COMMERCE)
const old2 = `      )}
      )}

      {/* ═══ COMMERCE ═══ */}`;
const new2 = `      )}

      {/* ═══ COMMERCE ═══ */}`;

if (s.includes(old2)) {
  s = s.replace(old2, new2);
  n++;
  console.log('  OK suppression )} en trop');
} else {
  // Essayer variante sans saut
  const old2b = `      )}\n      )}\n\n      {/* ═══ COMMERCE ═══ */}`;
  if (s.includes(old2b)) {
    s = s.replace(old2b, `      )}\n\n      {/* ═══ COMMERCE ═══ */}`);
    n++;
    console.log('  OK suppression )} en trop (variante)');
  } else {
    console.warn('  ⚠ anchor 2 introuvable — vérifier manuellement');
  }
}

fs.writeFileSync(p, s);
console.log(`\n✅ ${n}/2 fix`);
