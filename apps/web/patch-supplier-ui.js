const fs = require('fs');
const p = 'app/dashboard/crm/[id]/page.tsx';
let s = fs.readFileSync(p, 'utf8');
let n = 0;
function tryR(old, neu, label) {
  if (!s.includes(old)) { console.warn(`  MISS ${label}`); return false; }
  s = s.replace(old, neu); console.log(`  OK ${label}`); n++; return true;
}

console.log('Patch UI fournisseur...');

// 1. Stats bar : remplacer les 4 stats fixes par version conditionnelle
const oldStats = `          <div className="px-4 py-2 text-center">
            <p className="text-[10px] text-slate-500 uppercase font-semibold">RÉSA</p>
            <p className="text-base font-bold text-slate-900">{customer.stats.totalReservations}</p>
          </div>
          <div className="px-4 py-2 text-center">
            <p className="text-[10px] text-slate-500 uppercase font-semibold">DÉPENSÉ</p>
            <p className="text-sm font-bold text-slate-900 truncate">{customer.stats.totalSpent.toLocaleString('fr-FR')} Ar</p>
          </div>
          <div className="px-4 py-2 text-center">
            <p className="text-[10px] text-slate-500 uppercase font-semibold">RESTE</p>
            <p className={\`text-sm font-bold truncate \${customer.stats.outstanding > 0 ? 'text-red-600' : 'text-green-600'}\`}>
              {customer.stats.outstanding.toLocaleString('fr-FR')} Ar
            </p>
          </div>
          <div className="px-4 py-2 text-center">
            <p className="text-[10px] text-slate-500 uppercase font-semibold">DERNIÈRE</p>
            <p className="text-sm font-bold text-slate-900 truncate">
              {customer.stats.lastVisit ? new Date(customer.stats.lastVisit).toLocaleDateString('fr-FR') : '—'}
            </p>
          </div>`;

const newStats = `          {isSupplier && !isCustomer ? (
            <>
              <div className="px-4 py-2 text-center">
                <p className="text-[10px] text-slate-500 uppercase font-semibold">COMMANDES</p>
                <p className="text-base font-bold text-slate-900">{customer.stats.totalOrders || 0}</p>
              </div>
              <div className="px-4 py-2 text-center">
                <p className="text-[10px] text-slate-500 uppercase font-semibold">ACHATS</p>
                <p className="text-sm font-bold text-slate-900 truncate">{(customer.stats.totalPurchases || 0).toLocaleString('fr-FR')} Ar</p>
              </div>
              <div className="px-4 py-2 text-center">
                <p className="text-[10px] text-slate-500 uppercase font-semibold">EN ATTENTE</p>
                <p className={\`text-sm font-bold truncate \${(customer.stats.pendingOrders || 0) > 0 ? 'text-cyan-600' : 'text-slate-600'}\`}>
                  {customer.stats.pendingOrders || 0}
                </p>
              </div>
              <div className="px-4 py-2 text-center">
                <p className="text-[10px] text-slate-500 uppercase font-semibold">DERNIÈRE CMD</p>
                <p className="text-sm font-bold text-slate-900 truncate">
                  {customer.stats.lastOrderAt ? new Date(customer.stats.lastOrderAt).toLocaleDateString('fr-FR') : '—'}
                </p>
              </div>
            </>
          ) : (
            <>
              <div className="px-4 py-2 text-center">
                <p className="text-[10px] text-slate-500 uppercase font-semibold">RÉSA</p>
                <p className="text-base font-bold text-slate-900">{customer.stats.totalReservations}</p>
              </div>
              <div className="px-4 py-2 text-center">
                <p className="text-[10px] text-slate-500 uppercase font-semibold">DÉPENSÉ</p>
                <p className="text-sm font-bold text-slate-900 truncate">{customer.stats.totalSpent.toLocaleString('fr-FR')} Ar</p>
              </div>
              <div className="px-4 py-2 text-center">
                <p className="text-[10px] text-slate-500 uppercase font-semibold">RESTE</p>
                <p className={\`text-sm font-bold truncate \${customer.stats.outstanding > 0 ? 'text-red-600' : 'text-green-600'}\`}>
                  {customer.stats.outstanding.toLocaleString('fr-FR')} Ar
                </p>
              </div>
              <div className="px-4 py-2 text-center">
                <p className="text-[10px] text-slate-500 uppercase font-semibold">DERNIÈRE</p>
                <p className="text-sm font-bold text-slate-900 truncate">
                  {customer.stats.lastVisit ? new Date(customer.stats.lastVisit).toLocaleDateString('fr-FR') : '—'}
                </p>
              </div>
            </>
          )}`;

tryR(oldStats, newStats, 'stats bar conditionnelle');

// 2. Section Identité : retirer les champs redondants pour fournisseur
tryR(
  `<div className="grid grid-cols-2 gap-x-8 gap-y-4">
                  <Field label="Nom" value={isSupplier && !isCustomer ? customer.name : customer.lastName} />
                  <Field label="Prénom" value={isSupplier && !isCustomer ? customer.contactName : customer.firstName} />
                  <Field label={isSupplier && !isCustomer ? 'Raison sociale' : 'Nom complet'} value={fullName} />
                  {isSupplier && customer.leadTimeDays != null && (
                    <Field label="Delai livraison" value={customer.leadTimeDays + ' jours'} />
                  )}
                  {isSupplier && customer.contactName && (
                    <Field label="Contact principal" value={customer.contactName} />
                  )}
                  <Field label={isSupplier && !isCustomer ? 'Partenaire depuis' : 'Client depuis'} value={sinceDate} />
                </div>`,
  `<div className="grid grid-cols-2 gap-x-8 gap-y-4">
                  {isSupplier && !isCustomer ? (
                    <>
                      <Field label="Raison sociale" value={customer.name} />
                      <Field label="Contact principal" value={customer.contactName || '—'} />
                      <Field label="Delai de livraison" value={customer.leadTimeDays != null ? customer.leadTimeDays + ' jours' : '—'} />
                      <Field label="Partenaire depuis" value={sinceDate} />
                    </>
                  ) : (
                    <>
                      <Field label="Nom" value={customer.lastName || '—'} />
                      <Field label="Prenom" value={customer.firstName || '—'} />
                      <Field label="Nom complet" value={fullName} />
                      <Field label="Client depuis" value={sinceDate} />
                    </>
                  )}
                </div>`,
  'section identite'
);

// 3. Masquer la section Tags pour fournisseur ? Non, on garde.

// 4. Section "Synthèse" (point 4 ou 5) : adapter pour fournisseur
tryR(
  `<div className="grid grid-cols-4 gap-4">
                  <StatBox label="Réservations" value={customer.stats.totalReservations} />
                  <StatBox label="Total dépensé" value={\`\${customer.stats.totalSpent.toLocaleString('fr-FR')} Ar\`} />
                  <StatBox label="Reste à payer" value={\`\${customer.stats.outstanding.toLocaleString('fr-FR')} Ar\`} red={customer.stats.outstanding > 0} />
                  <StatBox label="Dernière visite" value={customer.stats.lastVisit ? new Date(customer.stats.lastVisit).toLocaleDateString('fr-FR') : '—'} />
                </div>`,
  `{isSupplier && !isCustomer ? (
                  <div className="grid grid-cols-4 gap-4">
                    <StatBox label="Commandes" value={customer.stats.totalOrders || 0} />
                    <StatBox label="Total achats" value={\`\${(customer.stats.totalPurchases || 0).toLocaleString('fr-FR')} Ar\`} />
                    <StatBox label="En attente" value={customer.stats.pendingOrders || 0} />
                    <StatBox label="Articles fournis" value={customer.stats.totalStockItems || 0} />
                  </div>
                ) : (
                  <div className="grid grid-cols-4 gap-4">
                    <StatBox label="Reservations" value={customer.stats.totalReservations} />
                    <StatBox label="Total depense" value={\`\${customer.stats.totalSpent.toLocaleString('fr-FR')} Ar\`} />
                    <StatBox label="Reste a payer" value={\`\${customer.stats.outstanding.toLocaleString('fr-FR')} Ar\`} red={customer.stats.outstanding > 0} />
                    <StatBox label="Derniere visite" value={customer.stats.lastVisit ? new Date(customer.stats.lastVisit).toLocaleDateString('fr-FR') : '—'} />
                  </div>
                )}`,
  'synthese'
);

fs.writeFileSync(p, s);
console.log(`\n✅ ${n}/3 patch(es)`);
