const fs = require("fs");
const p = "app/dashboard/caisse/page.tsx";
let s = fs.readFileSync(p, "utf8");
let n = 0;
function tryR(old, neu, label) {
  if (!s.includes(old)) { console.warn(`  MISS ${label}`); return false; }
  s = s.replace(old, neu); console.log(`  OK ${label}`); n++; return true;
}

console.log("Patches historique caisse...");

// 1. Imports (si pas deja)
if (!s.includes("lib/usePagination")) {
  tryR(
    "import type { ReactNode } from 'react';",
    `import type { ReactNode } from 'react';
import { usePagination } from '../../lib/usePagination';
import { Pagination } from '../../lib/Pagination';`,
    "imports hook"
  );
}

// 2. States filtres historique (apres historyOrders)
tryR(
  `  const [historyOrders, setHistoryOrders] = useState<any[]>([]);`,
  `  const [historyOrders, setHistoryOrders] = useState<any[]>([]);
  const [histSearch, setHistSearch] = useState('');
  const [histPreset, setHistPreset] = useState<'today' | 'week' | 'month' | 'all'>('week');
  const [histStatus, setHistStatus] = useState<string>('ALL');
  const [histMode, setHistMode] = useState<string>('ALL');
  const [histSort, setHistSort] = useState<'recent' | 'old' | 'amount-desc' | 'amount-asc'>('recent');`,
  "states filtres"
);

// 3. Calcul filtered + hook pagination avant if loading
tryR(
  `  if (loading) return <div className="flex justify-center items-center h-64"><div className="animate-spin rounded-full h-10 w-10 border-4 border-teal-400 border-t-transparent"></div></div>;`,
  `  // ─── Filtre historique caisse ───
  const histFiltered = (() => {
    let list = [...historyOrders];

    // Preset date
    if (histPreset !== 'all') {
      const now = Date.now();
      const conf = histPreset === 'today' ? 86400000 : histPreset === 'week' ? 7 * 86400000 : 30 * 86400000;
      const from = now - conf;
      list = list.filter(o => new Date(o.createdAt).getTime() >= from);
    }

    // Statut
    if (histStatus !== 'ALL') list = list.filter(o => o.paymentStatus === histStatus);

    // Mode paiement
    if (histMode !== 'ALL') list = list.filter(o => getOrderPaymentMode(o) === histMode);

    // Recherche
    if (histSearch.trim()) {
      const q = histSearch.toLowerCase();
      list = list.filter(o => {
        const id = o.id.slice(-4).toLowerCase();
        const table = (o.table?.number || '').toLowerCase();
        const room = (o.roomNumber || '').toLowerCase();
        const items = (o.items || []).map((it: any) => (it.menuItem?.name || '').toLowerCase()).join(' ');
        return id.includes(q) || table.includes(q) || room.includes(q) || items.includes(q);
      });
    }

    // Tri
    list.sort((a, b) => {
      if (histSort === 'amount-desc') return (b.total || 0) - (a.total || 0);
      if (histSort === 'amount-asc') return (a.total || 0) - (b.total || 0);
      const da = new Date(a.createdAt).getTime();
      const db = new Date(b.createdAt).getTime();
      return histSort === 'old' ? da - db : db - da;
    });

    return list;
  })();

  const histTotals = histFiltered.reduce(
    (acc, o) => {
      acc.ca += o.total || 0;
      acc.paid += o.paidAmount || 0;
      acc.count += 1;
      return acc;
    },
    { ca: 0, paid: 0, count: 0 }
  );
  const histAvg = histTotals.count > 0 ? Math.round(histTotals.ca / histTotals.count) : 0;

  const pagHist = usePagination(histFiltered, { perPageDefault: 20 });

  if (loading) return <div className="flex justify-center items-center h-64"><div className="animate-spin rounded-full h-10 w-10 border-4 border-teal-400 border-t-transparent"></div></div>;`,
  "filtre + totaux + hook"
);

// 4. Barre de filtres avant le tableau historique
tryR(
  `      {tab === 'history' && (
        <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
          <table className="w-full text-left">`,
  `      {tab === 'history' && (
        <div className="space-y-3">
          {/* Barre filtres */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-3 space-y-3">
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
                </svg>
              </span>
              <input
                type="text"
                placeholder="Rechercher par #id, table, chambre, article..."
                value={histSearch}
                onChange={e => setHistSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:ring-2 focus:ring-teal-400 focus:border-teal-400 focus:bg-white transition"
              />
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              {([
                { v: 'today', l: "Aujourd'hui" },
                { v: 'week', l: '7 jours' },
                { v: 'month', l: '30 jours' },
                { v: 'all', l: 'Tout' },
              ] as const).map(p => (
                <button
                  key={p.v}
                  onClick={() => setHistPreset(p.v)}
                  className={\`px-3 py-1.5 rounded-lg text-xs font-bold transition \${histPreset === p.v ? 'bg-slate-900 text-white shadow' : 'bg-white border border-slate-200 text-slate-600 hover:border-slate-400'}\`}
                >
                  {p.l}
                </button>
              ))}
              <span className="w-px h-5 bg-slate-200 mx-1"></span>
              <select
                value={histStatus}
                onChange={e => setHistStatus(e.target.value)}
                className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-700 cursor-pointer"
              >
                <option value="ALL">Tous statuts</option>
                <option value="PAID">Payé</option>
                <option value="PARTIAL">Partiel</option>
                <option value="UNPAID">Non payé</option>
                <option value="DEFERRED">Au folio</option>
                <option value="CREDIT">À crédit</option>
                <option value="CANCELLED">Annulé</option>
              </select>
              <select
                value={histMode}
                onChange={e => setHistMode(e.target.value)}
                className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-700 cursor-pointer"
              >
                <option value="ALL">Tous modes</option>
                <option value="CASH">Espèces</option>
                <option value="CARD">Carte</option>
                <option value="MOBILE">Mobile</option>
                <option value="ROOM_CHARGE">Chambre</option>
                <option value="CREDIT">Crédit</option>
              </select>
              <select
                value={histSort}
                onChange={e => setHistSort(e.target.value as any)}
                className="ml-auto px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-700 cursor-pointer"
              >
                <option value="recent">Plus récent</option>
                <option value="old">Plus ancien</option>
                <option value="amount-desc">Montant ↓</option>
                <option value="amount-asc">Montant ↑</option>
              </select>
            </div>
          </div>

          {/* Bandeau totaux */}
          <div className="bg-gradient-to-r from-slate-900 to-slate-800 rounded-xl p-4 text-white">
            <div className="grid grid-cols-3 gap-4">
              <div>
                <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest mb-1">Commandes</p>
                <p className="text-2xl font-black tabular-nums">{histTotals.count}</p>
              </div>
              <div>
                <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest mb-1">Chiffre d'affaires</p>
                <p className="text-2xl font-black tabular-nums text-teal-400">{histTotals.ca.toLocaleString('fr-FR')} <span className="text-sm text-slate-400">Ar</span></p>
              </div>
              <div>
                <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest mb-1">Panier moyen</p>
                <p className="text-2xl font-black tabular-nums">{histAvg.toLocaleString('fr-FR')} <span className="text-sm text-slate-400">Ar</span></p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
          <table className="w-full text-left">`,
  "barre filtres + totaux"
);

// 5. historyOrders.map → pagHist.pageItems.map
tryR(
  `              {historyOrders.map(o => {`,
  `              {pagHist.pageItems.map(o => {`,
  "tableau → pageItems"
);

// 6. Empty state
tryR(
  `              {historyOrders.length === 0 && (
                <tr><td colSpan={8} className="p-12 text-center text-slate-400 font-medium">Aucune commande dans l'historique</td></tr>
              )}`,
  `              {pagHist.pageItems.length === 0 && (
                <tr><td colSpan={8} className="p-12 text-center text-slate-400 font-medium">
                  {histSearch || histStatus !== 'ALL' || histMode !== 'ALL' || histPreset !== 'all'
                    ? 'Aucune commande ne correspond aux filtres'
                    : "Aucune commande dans l'historique"}
                </td></tr>
              )}`,
  "empty state"
);

// 7. Fermer le div + ajouter pagination
tryR(
  `            </tbody>
          </table>
        </div>
      )}


      {tab === 'menu' && (`,
  `            </tbody>
          </table>
          </div>

          <Pagination
            page={pagHist.page}
            totalPages={pagHist.totalPages}
            onPageChange={pagHist.setPage}
            perPage={pagHist.perPage}
            perPageOptions={pagHist.perPageOptions}
            onPerPageChange={pagHist.setPerPage}
            total={pagHist.total}
          />
        </div>
      )}


      {tab === 'menu' && (`,
  "pagination + fermeture"
);

fs.writeFileSync(p, s);
console.log(`\nTotal : ${n}/7 patch(es)`);
