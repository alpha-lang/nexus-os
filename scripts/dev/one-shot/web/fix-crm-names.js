const fs = require('fs');
const p = 'app/dashboard/crm/[id]/page.tsx';
let s = fs.readFileSync(p, 'utf8');
let n = 0;
function tryR(old, neu, label) {
  if (!s.includes(old)) { console.warn(`  MISS ${label}`); return false; }
  s = s.replace(old, neu); console.log(`  OK ${label}`); n++; return true;
}

console.log('Fix noms orphelins + badge type...');

// 1. Nom complet dans la fiche
tryR(
  `<Field label="Nom complet" value={\`\${customer.firstName} \${customer.lastName}\`} />`,
  `<Field label={isSupplier && !isCustomer ? 'Raison sociale' : 'Nom complet'} value={fullName} />`,
  'Nom complet → fullName'
);

// 2. Titre impression historique (title)
tryR(
  `<html><head><title>Historique - \${customer.firstName} \${customer.lastName}</title>`,
  `<html><head><title>Historique - \${fullName}</title>`,
  'print title'
);

// 3. Titre impression historique (h1)
tryR(
  `<h1>Historique client — \${customer.firstName} \${customer.lastName}</h1>`,
  `<h1>Historique - \${fullName}</h1>`,
  'print h1'
);

// 4. ConfirmDialog suppression
tryR(
  `<ConfirmDialog open={showDelete} title="Supprimer le client" message={\`Supprimer \${customer.firstName} \${customer.lastName} ?\`} onClose={() => setShowDelete(false)} onConfirm={confirmDelete} isLoading={isDeleting} />`,
  `<ConfirmDialog open={showDelete} title={isSupplier && !isCustomer ? 'Supprimer le fournisseur' : 'Supprimer le client'} message={\`Supprimer \${fullName} ?\`} onClose={() => setShowDelete(false)} onConfirm={confirmDelete} isLoading={isDeleting} />`,
  'ConfirmDialog suppression'
);

// 5. Badge type à côté du nom (avant le badge clientNumber)
tryR(
  `              <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-mono">
                {clientNumber}
              </span>`,
  `              <span className={\`inline-flex items-center gap-1 text-[10px] font-black tracking-wider px-2 py-0.5 rounded \${typeMeta.bg} \${typeMeta.text}\`}>
                {typeMeta.icon} {typeMeta.label}
              </span>
              <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-mono">
                {clientNumber}
              </span>`,
  'badge type header'
);

fs.writeFileSync(p, s);
console.log(`\n✅ ${n}/5 patch(es)`);
