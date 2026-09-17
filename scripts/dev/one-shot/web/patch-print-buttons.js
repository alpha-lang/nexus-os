const fs = require("fs");
const p = "app/dashboard/stock/orders/[id]/page.tsx";
let s = fs.readFileSync(p, "utf8");

const old = `        <button
          onClick={printPO}
          className="px-4 py-2.5 bg-slate-900 text-white rounded-xl font-black text-sm hover:bg-slate-700 transition inline-flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"/>
          </svg>
          Imprimer le bon
        </button>`;

const neu = `        <button
          onClick={printPO}
          className="px-4 py-2.5 bg-blue-600 text-white rounded-xl font-black text-sm hover:bg-blue-700 transition inline-flex items-center gap-2"
          title="Bon de commande (avant livraison)"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
          </svg>
          Bon de commande
        </button>

        {(order.status === 'RECEIVED' || order.status === 'PARTIAL') && (
          <button
            onClick={printGRN}
            className="px-4 py-2.5 bg-emerald-600 text-white rounded-xl font-black text-sm hover:bg-emerald-700 transition inline-flex items-center gap-2"
            title="Bon de reception (apres livraison)"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/>
            </svg>
            Bon de reception
          </button>
        )}`;

if (!s.includes(old)) { console.error("❌ anchor bouton introuvable"); process.exit(1); }
s = s.replace(old, neu);
fs.writeFileSync(p, s);
console.log("✅ 2 boutons d'impression distincts");
