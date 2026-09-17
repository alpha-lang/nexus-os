const fs = require('fs');
const p = 'app/dashboard/crm/[id]/page.tsx';
let s = fs.readFileSync(p, 'utf8');
let n = 0;
function tryR(old, neu, label) {
  if (!s.includes(old)) { console.warn(`  MISS ${label}`); return false; }
  s = s.replace(old, neu); console.log(`  OK ${label}`); n++; return true;
}

// 1. Étendre le type Tab
tryR(
  `const [tab, setTab] = useState<'fiche' | 'historique' | 'reservations' | 'sales' | 'notes' | 'documents'>('fiche');`,
  `const [tab, setTab] = useState<'fiche' | 'historique' | 'reservations' | 'sales' | 'orders' | 'notes' | 'documents'>('fiche');`,
  'type Tab etendu'
);

// 2. Ajouter le bouton Commandes (juste avant "notes")
tryR(
  `          {isCustomer && (
            <button onClick={() => setTab('sales')} className={\`px-4 py-2 rounded-xl text-sm font-medium transition \${tab === 'sales' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-50'}\`}>
              🛒 Ventes ({customer.stats.totalSales})
            </button>
          )}
          <button onClick={() => setTab('notes')}`,
  `          {isCustomer && (
            <button onClick={() => setTab('sales')} className={\`px-4 py-2 rounded-xl text-sm font-medium transition \${tab === 'sales' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-50'}\`}>
              🛒 Ventes ({customer.stats.totalSales})
            </button>
          )}
          {isSupplier && (
            <button onClick={() => setTab('orders')} className={\`px-4 py-2 rounded-xl text-sm font-medium transition \${tab === 'orders' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-50'}\`}>
              📦 Commandes ({customer.purchaseOrders?.length || 0})
            </button>
          )}
          <button onClick={() => setTab('notes')}`,
  'bouton Commandes'
);

fs.writeFileSync(p, s);
console.log(`\n✅ ${n}/2 patch(es)`);
