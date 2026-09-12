const fs = require('fs');
const p = 'app/dashboard/crm/[id]/page.tsx';
let s = fs.readFileSync(p, 'utf8');

// Anchor : juste avant l'onglet "documents" ou après "notes" 
// On va insérer AVANT la section documents
const anchor = `        {/* ═══ DOCUMENTS ═══ */}`;

if (!s.includes(anchor)) {
  // Fallback : chercher un autre anchor
  const alt = `{tab === 'documents' && (`;
  if (!s.includes(alt)) {
    console.error('❌ aucun anchor documents trouve');
    process.exit(1);
  }
}

const ordersSection = `        {/* ═══ COMMANDES FOURNISSEUR ═══ */}
        {tab === 'orders' && isSupplier && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900">Commandes fournisseur</h3>
              <a
                href={\`/dashboard/stock/orders?supplierId=\${customer.id}\`}
                className="inline-flex items-center gap-2 px-4 py-2 bg-linear-to-r from-blue-600 to-teal-500 text-white rounded-xl text-sm font-semibold hover:shadow-lg transition"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"/>
                </svg>
                Nouvelle commande
              </a>
            </div>

            {(!customer.purchaseOrders || customer.purchaseOrders.length === 0) ? (
              <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
                <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center text-3xl mx-auto mb-3">
                  📦
                </div>
                <p className="text-slate-500 font-semibold">Aucune commande</p>
                <p className="text-xs text-slate-400 mt-1">Aucune commande passee avec ce fournisseur</p>
                <a
                  href={\`/dashboard/stock/orders?supplierId=\${customer.id}\`}
                  className="mt-4 inline-block text-sm font-bold text-teal-600 hover:underline"
                >
                  + Creer la premiere commande
                </a>
              </div>
            ) : (
              <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 border-b border-slate-200">
                      <tr>
                        <th className="p-3 font-black text-slate-600 text-[10px] uppercase tracking-wider">Reference</th>
                        <th className="p-3 font-black text-slate-600 text-[10px] uppercase tracking-wider hidden sm:table-cell">Date</th>
                        <th className="p-3 font-black text-slate-600 text-[10px] uppercase tracking-wider text-center hidden md:table-cell">Articles</th>
                        <th className="p-3 font-black text-slate-600 text-[10px] uppercase tracking-wider text-right">Total</th>
                        <th className="p-3 font-black text-slate-600 text-[10px] uppercase tracking-wider text-center">Statut</th>
                        <th className="p-3 font-black text-slate-600 text-[10px] uppercase tracking-wider text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {customer.purchaseOrders.map((o: any) => {
                        const statusMeta: Record<string, { label: string; bg: string; text: string }> = {
                          DRAFT:     { label: 'Brouillon', bg: 'bg-slate-100',   text: 'text-slate-700' },
                          SENT:      { label: 'Envoyee',   bg: 'bg-cyan-100',    text: 'text-cyan-700' },
                          PARTIAL:   { label: 'Partielle', bg: 'bg-amber-100',   text: 'text-amber-700' },
                          RECEIVED:  { label: 'Recue',     bg: 'bg-emerald-100', text: 'text-emerald-700' },
                          CANCELLED: { label: 'Annulee',   bg: 'bg-red-100',     text: 'text-red-700' },
                        };
                        const sm = statusMeta[o.status] || statusMeta.DRAFT;
                        return (
                          <tr key={o.id} className="hover:bg-slate-50">
                            <td className="p-3">
                              <a href={\`/dashboard/stock/orders/\${o.id}\`} className="font-mono text-xs font-bold text-slate-900 hover:text-teal-600">
                                {o.reference}
                              </a>
                            </td>
                            <td className="p-3 text-xs text-slate-600 hidden sm:table-cell whitespace-nowrap">
                              {new Date(o.createdAt).toLocaleDateString('fr-FR')}
                            </td>
                            <td className="p-3 text-center text-slate-700 tabular-nums hidden md:table-cell">
                              {o.items?.length || o._count?.items || 0}
                            </td>
                            <td className="p-3 text-right font-bold text-slate-900 tabular-nums whitespace-nowrap">
                              {(o.totalAmount || 0).toLocaleString('fr-FR')} Ar
                            </td>
                            <td className="p-3 text-center">
                              <span className={'inline-flex items-center text-[10px] font-black tracking-wider px-2 py-0.5 rounded-md ' + sm.bg + ' ' + sm.text}>
                                {sm.label.toUpperCase()}
                              </span>
                            </td>
                            <td className="p-3 text-center">
                              <a href={\`/dashboard/stock/orders/\${o.id}\`} className="text-xs font-bold text-teal-600 hover:underline">
                                Voir
                              </a>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ═══ DOCUMENTS ═══ */}`;

if (!s.includes(anchor)) { console.error('❌ anchor documents introuvable'); process.exit(1); }
s = s.replace(anchor, ordersSection);

fs.writeFileSync(p, s);
console.log('✅ Onglet Commandes insere');
