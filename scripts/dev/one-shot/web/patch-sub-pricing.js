const fs = require("fs");
const p = "app/dashboard/subscriptions/page.tsx";
let s = fs.readFileSync(p, "utf8");
let n = 0;
function tryR(old, neu, label) {
  if (!s.includes(old)) { console.warn(`  MISS ${label}`); return false; }
  s = s.replace(old, neu); console.log(`  OK ${label}`); n++; return true;
}

console.log("Patch subscriptions front pricing...");

// 1. Import helper
tryR(
  `import { usePagination } from '../../../lib/usePagination';`,
  `import { usePagination } from '../../../lib/usePagination';
import { resolvePrice } from '../../../lib/pricing';`,
  "import helper"
);

// 2. computePrice utilise resolvePrice + org type
tryR(
  `  function computePrice(sub: any): number {
    if (sub.status !== 'ACTIVE') return 0;
    return (sub.activeModules || []).filter((am: any) => am.isActive).reduce((s: number, am: any) => s + (am.module?.price || 0), 0);
  }`,
  `  function computePrice(sub: any): number {
    if (sub.status !== 'ACTIVE') return 0;
    const orgType = sub.organization?.type;
    return (sub.activeModules || [])
      .filter((am: any) => am.isActive)
      .reduce((s: number, am: any) => s + resolvePrice(am.module, orgType), 0);
  }`,
  "computePrice avec resolvePrice"
);

// 3. Affichage du prix par module dans la carte
tryR(
  `                          <span className="text-xs text-slate-500">
                            {am.module?.price ? \`\${am.module.price.toLocaleString('fr-FR')} Ar\` : 'Gratuit'}
                          </span>`,
  `                          <span className="text-xs text-slate-500">
                            {(() => {
                              const price = resolvePrice(am.module, sub.organization?.type);
                              return price > 0 ? \`\${price.toLocaleString('fr-FR')} Ar\` : 'Gratuit';
                            })()}
                          </span>`,
  "prix module carte"
);

fs.writeFileSync(p, s);
console.log(`\nTotal : ${n}/3 patch(es)`);
