const fs = require('fs');
const p = 'app/dashboard/crm/[id]/page.tsx';
let s = fs.readFileSync(p, 'utf8');
let n = 0;
function tryR(old, neu, label) {
  if (!s.includes(old)) { console.warn(`  MISS ${label}`); return false; }
  s = s.replace(old, neu); console.log(`  OK ${label}`); n++; return true;
}

// 1. Nom dans le header — remplacer {customer.firstName} {customer.lastName}
tryR(
  `                {customer.firstName} {customer.lastName}`,
  `                {fullName}`,
  'header nom'
);

// 2. Titre "Fiche client" → dynamique
tryR(
  `                  <p className="text-[10px] text-slate-400 uppercase tracking-wider">Fiche client</p>`,
  `                  <p className="text-[10px] text-slate-400 uppercase tracking-wider">
                    {customer.type === 'SUPPLIER' ? 'Fiche fournisseur' : customer.type === 'BOTH' ? 'Fiche partenaire' : 'Fiche client'}
                  </p>`,
  'titre fiche'
);

// 3. Titre "FICHE D'IDENTITÉ CLIENT" → dynamique
tryR(
  `<h1 className="text-2xl font-black text-slate-900 tracking-tight uppercase">Fiche d'identité client</h1>`,
  `<h1 className="text-2xl font-black text-slate-900 tracking-tight uppercase">
                  {customer.type === 'SUPPLIER' ? 'Fiche fournisseur' : customer.type === 'BOTH' ? 'Fiche partenaire' : "Fiche d'identité client"}
                </h1>`,
  'grand titre fiche'
);

// 4. Champs Nom/Prénom — affichage dynamique selon type
tryR(
  `                  <Field label="Nom" value={customer.lastName} />
                  <Field label="Prénom" value={customer.firstName} />`,
  `                  <Field label="Nom" value={isSupplier && !isCustomer ? customer.name : customer.lastName} />
                  <Field label="Prénom" value={isSupplier && !isCustomer ? customer.contactName : customer.firstName} />`,
  'champs nom prenom'
);

// 5. Masquer onglets Réservations/Ventes si SUPPLIER seul
tryR(
  `          <button onClick={() => setTab('reservations')} className={\`px-4 py-2 rounded-xl text-sm font-medium transition \${tab === 'reservations' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-50'}\`}>
            📅 Réservations ({customer.stats.totalReservations})
          </button>`,
  `          {isCustomer && (
            <button onClick={() => setTab('reservations')} className={\`px-4 py-2 rounded-xl text-sm font-medium transition \${tab === 'reservations' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-50'}\`}>
              📅 Réservations ({customer.stats.totalReservations})
            </button>
          )}`,
  'onglet reservations'
);

tryR(
  `          <button onClick={() => setTab('sales')} className={\`px-4 py-2 rounded-xl text-sm font-medium transition \${tab === 'sales' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-50'}\`}>
            🛒 Ventes ({customer.stats.totalSales})
          </button>`,
  `          {isCustomer && (
            <button onClick={() => setTab('sales')} className={\`px-4 py-2 rounded-xl text-sm font-medium transition \${tab === 'sales' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-50'}\`}>
              🛒 Ventes ({customer.stats.totalSales})
            </button>
          )}`,
  'onglet ventes'
);

// 6. Badge type dans le bandeau stats (déjà en haut de la fiche ?)
// Ajout badge dans le bandeau header juste avant le bouton Imprimer
tryR(
  `            <div className="flex gap-1.5 shrink-0">
              <button onClick={handlePrint}`,
  `            <div className="flex gap-1.5 shrink-0">
              <span className={\`inline-flex items-center gap-1 text-[10px] font-black tracking-wider px-2.5 py-1 rounded-md \${typeMeta.bg} \${typeMeta.text}\`}>
                {typeMeta.icon} {typeMeta.label}
              </span>
              <button onClick={handlePrint}`,
  'badge type'
);

// 7. Délai livraison pour fournisseur (ajouter un Field après "Client depuis")
tryR(
  `                  <Field label="Client depuis" value={sinceDate} />`,
  `                  {isSupplier && customer.leadTimeDays != null && (
                    <Field label="Delai livraison" value={customer.leadTimeDays + ' jours'} />
                  )}
                  {isSupplier && customer.contactName && (
                    <Field label="Contact principal" value={customer.contactName} />
                  )}
                  <Field label={isSupplier && !isCustomer ? 'Partenaire depuis' : 'Client depuis'} value={sinceDate} />`,
  'champs fournisseur'
);

fs.writeFileSync(p, s);
console.log(`\n✅ ${n}/7 patch(es)`);
