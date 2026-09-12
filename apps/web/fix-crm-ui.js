const fs = require('fs');
const p = 'app/dashboard/crm/[id]/page.tsx';
let s = fs.readFileSync(p, 'utf8');
let n = 0;
function tryR(old, neu, label) {
  if (!s.includes(old)) { console.warn(`  MISS ${label}`); return false; }
  s = s.replace(old, neu); console.log(`  OK ${label}`); n++; return true;
}

console.log('Fix stats bar + signature...');

// 1. Stats bar conditionnelle (avec les VRAIS labels "Résa"/"Dépensé")
tryR(
  `        {/* Ligne 2 : stats inline */}
        <div className="grid grid-cols-4 divide-x divide-gray-100">
          <div className="px-4 py-2 text-center">
            <p className="text-[10px] text-slate-500 uppercase font-semibold">Résa</p>
            <p className="text-base font-bold text-slate-900">{customer.stats.totalReservations}</p>
          </div>
          <div className="px-4 py-2 text-center">
            <p className="text-[10px] text-slate-500 uppercase font-semibold">Dépensé</p>
            <p className="text-sm font-bold text-slate-900 truncate">{customer.stats.totalSpent.toLocaleString('fr-FR')} Ar</p>
          </div>
          <div className="px-4 py-2 text-center">
            <p className="text-[10px] text-slate-500 uppercase font-semibold">Reste</p>
            <p className={\`text-sm font-bold truncate \${customer.stats.outstanding > 0 ? 'text-red-600' : 'text-green-600'}\`}>
              {customer.stats.outstanding.toLocaleString('fr-FR')} Ar
            </p>
          </div>
          <div className="px-4 py-2 text-center">
            <p className="text-[10px] text-slate-500 uppercase font-semibold">Dernière</p>
            <p className="text-sm font-bold text-slate-900 truncate">
              {customer.stats.lastVisit ? new Date(customer.stats.lastVisit).toLocaleDateString('fr-FR') : '—'}
            </p>
          </div>
        </div>`,
  `        {/* Ligne 2 : stats inline */}
        {isSupplier && !isCustomer ? (
          <div className="grid grid-cols-4 divide-x divide-gray-100">
            <div className="px-4 py-2 text-center">
              <p className="text-[10px] text-slate-500 uppercase font-semibold">Commandes</p>
              <p className="text-base font-bold text-slate-900">{customer.stats.totalOrders || 0}</p>
            </div>
            <div className="px-4 py-2 text-center">
              <p className="text-[10px] text-slate-500 uppercase font-semibold">Total achats</p>
              <p className="text-sm font-bold text-slate-900 truncate">{(customer.stats.totalPurchases || 0).toLocaleString('fr-FR')} Ar</p>
            </div>
            <div className="px-4 py-2 text-center">
              <p className="text-[10px] text-slate-500 uppercase font-semibold">En attente</p>
              <p className={\`text-sm font-bold truncate \${(customer.stats.pendingOrders || 0) > 0 ? 'text-cyan-600' : 'text-slate-600'}\`}>
                {customer.stats.pendingOrders || 0}
              </p>
            </div>
            <div className="px-4 py-2 text-center">
              <p className="text-[10px] text-slate-500 uppercase font-semibold">Dernière cmd</p>
              <p className="text-sm font-bold text-slate-900 truncate">
                {customer.stats.lastOrderAt ? new Date(customer.stats.lastOrderAt).toLocaleDateString('fr-FR') : '—'}
              </p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-4 divide-x divide-gray-100">
            <div className="px-4 py-2 text-center">
              <p className="text-[10px] text-slate-500 uppercase font-semibold">Résa</p>
              <p className="text-base font-bold text-slate-900">{customer.stats.totalReservations}</p>
            </div>
            <div className="px-4 py-2 text-center">
              <p className="text-[10px] text-slate-500 uppercase font-semibold">Dépensé</p>
              <p className="text-sm font-bold text-slate-900 truncate">{customer.stats.totalSpent.toLocaleString('fr-FR')} Ar</p>
            </div>
            <div className="px-4 py-2 text-center">
              <p className="text-[10px] text-slate-500 uppercase font-semibold">Reste</p>
              <p className={\`text-sm font-bold truncate \${customer.stats.outstanding > 0 ? 'text-red-600' : 'text-green-600'}\`}>
                {customer.stats.outstanding.toLocaleString('fr-FR')} Ar
              </p>
            </div>
            <div className="px-4 py-2 text-center">
              <p className="text-[10px] text-slate-500 uppercase font-semibold">Dernière</p>
              <p className="text-sm font-bold text-slate-900 truncate">
                {customer.stats.lastVisit ? new Date(customer.stats.lastVisit).toLocaleDateString('fr-FR') : '—'}
              </p>
            </div>
          </div>
        )}`,
  'stats bar conditionnelle'
);

// 2. Signature dynamique
tryR(
  `<p className="text-xs text-slate-500 uppercase tracking-wider mb-12">Signature du client</p>`,
  `<p className="text-xs text-slate-500 uppercase tracking-wider mb-12">
                      {isSupplier && !isCustomer ? 'Signature du fournisseur' : 'Signature du client'}
                    </p>`,
  'signature'
);

// 3. Cacher "Ventes" et "Réservations" dans la synthèse si SUPPLIER — déjà fait
// Vérifions si le patch a bien pris (le bloc StatBox)

fs.writeFileSync(p, s);
console.log(`\n✅ ${n}/2 patch(es)`);
