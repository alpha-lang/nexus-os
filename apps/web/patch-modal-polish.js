const fs = require("fs");
const p = "app/dashboard/caisse/page.tsx";
let s = fs.readFileSync(p, "utf8");
let n = 0;
function tryR(old, neu, label) {
  if (!s.includes(old)) { console.warn(`  MISS ${label}`); return false; }
  s = s.replace(old, neu); console.log(`  OK ${label}`); n++; return true;
}

console.log("Patch polish modale...");

// 1. Bloc TOTAL compact (200px vertical → 100px horizontal)
tryR(
  `              <div className="bg-linear-to-br from-slate-900 to-blue-900 rounded-2xl p-6 text-white">
                <div className="flex justify-between items-baseline pb-4 border-b border-white/20">
                  <span className="text-sm text-blue-200 font-bold uppercase">Total</span>
                  <span className="text-3xl font-black">{(selectedOrder?.total || 0).toLocaleString('fr-FR')} <span className="text-lg">Ar</span></span>
                </div>
                {selectedOrder.paidAmount > 0 && (
                  <div className="flex justify-between items-baseline pt-4 text-green-300">
                    <span className="text-sm font-medium">Déjà payé</span>
                    <span className="text-xl font-bold">{(selectedOrder?.paidAmount || 0).toLocaleString('fr-FR')} Ar</span>
                  </div>
                )}
                <div className={\`\${selectedOrder.paidAmount > 0 ? 'pt-4 mt-4 border-t border-white/20' : 'pt-4'} flex justify-between items-baseline\`}>
                  <span className="font-black text-sm uppercase text-blue-200">Reste à payer</span>
                  <span className={\`text-4xl font-black \${(selectedOrder.total - selectedOrder.paidAmount) > 0 ? 'text-red-400' : 'text-green-400'}\`}>{(selectedOrder.total - selectedOrder.paidAmount).toLocaleString('fr-FR')}<span className="text-lg ml-1">Ar</span></span>
                </div>
              </div>`,
  `              <div className="bg-linear-to-br from-slate-900 to-blue-900 rounded-2xl p-4 text-white grid grid-cols-2 gap-4">
                <div>
                  <p className="text-[10px] text-blue-200 font-black uppercase tracking-widest mb-1">Total</p>
                  <p className="text-2xl font-black tabular-nums leading-tight">
                    {(selectedOrder?.total || 0).toLocaleString('fr-FR')}
                    <span className="text-sm ml-1">Ar</span>
                  </p>
                  {selectedOrder.paidAmount > 0 && (
                    <p className="text-[10px] text-green-300 mt-1.5 tabular-nums">
                      Payé : {(selectedOrder.paidAmount || 0).toLocaleString('fr-FR')} Ar
                    </p>
                  )}
                </div>
                <div className="text-right border-l border-white/20 pl-4">
                  <p className="text-[10px] text-blue-200 font-black uppercase tracking-widest mb-1">Reste a payer</p>
                  <p className={\`text-2xl font-black tabular-nums leading-tight \${(selectedOrder.total - selectedOrder.paidAmount) > 0 ? 'text-red-400' : 'text-green-400'}\`}>
                    {(selectedOrder.total - selectedOrder.paidAmount).toLocaleString('fr-FR')}
                    <span className="text-sm ml-1">Ar</span>
                  </p>
                </div>
              </div>`,
  "bloc TOTAL compact 2 colonnes"
);

// 2. Boutons regroupes : Encaisser en haut, 3 secondaires en row dessous
tryR(
  `            <div className="border-t bg-white p-4 space-y-2">
              {selectedOrder.status === 'PENDING' && (
                <button onClick={() => sendToKitchen(selectedOrder.id)} className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl font-bold transition">Envoyer en cuisine</button>
              )}
              <div className="grid grid-cols-2 gap-2">
                <button onClick={() => printTicket(selectedOrder, selectedOrder.table, selectedOrder.reservation)} className="bg-white border-2 border-slate-300 hover:bg-slate-100 text-slate-900 py-3 rounded-xl font-bold text-sm transition">Réimprimer</button>
                <button onClick={() => cancelOrder(selectedOrder.id)} className="bg-red-100 hover:bg-red-200 text-red-700 py-3 rounded-xl font-bold text-sm transition">Annuler</button>
              </div>
              {((selectedOrder?.total || 0) - (selectedOrder?.paidAmount || 0)) > 0 && (
                <button
                  onClick={() => {
                    setPayAmount((((selectedOrder?.total || 0) - (selectedOrder?.paidAmount || 0))).toString());
                    setPayMethod('CASH');
                    setShowPayModal(true);
                  }}
                  className="w-full bg-linear-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white py-4 rounded-2xl font-black text-lg shadow-lg transition"
                >
                  💳 Encaisser {(((selectedOrder?.total || 0) - (selectedOrder?.paidAmount || 0))).toLocaleString("fr-FR")} Ar
                </button>
              )}
            </div>`,
  `            <div className="border-t bg-white p-4 space-y-2">
              {((selectedOrder?.total || 0) - (selectedOrder?.paidAmount || 0)) > 0 && (
                <button
                  onClick={() => {
                    setPayAmount((((selectedOrder?.total || 0) - (selectedOrder?.paidAmount || 0))).toString());
                    setPayMethod('CASH');
                    setShowPayModal(true);
                  }}
                  className="w-full bg-linear-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white py-3.5 rounded-2xl font-black text-base shadow-lg transition"
                >
                  Encaisser {(((selectedOrder?.total || 0) - (selectedOrder?.paidAmount || 0))).toLocaleString("fr-FR")} Ar
                </button>
              )}
              <div className="flex gap-2">
                {selectedOrder.status === 'PENDING' && (
                  <button onClick={() => sendToKitchen(selectedOrder.id)} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-xl font-bold text-sm transition">
                    Cuisine
                  </button>
                )}
                <button onClick={() => printTicket(selectedOrder, selectedOrder.table, selectedOrder.reservation)} className="flex-1 bg-white border-2 border-slate-300 hover:bg-slate-100 text-slate-900 py-2.5 rounded-xl font-bold text-sm transition">
                  Reimprimer
                </button>
                <button onClick={() => cancelOrder(selectedOrder.id)} className="flex-1 bg-red-100 hover:bg-red-200 text-red-700 py-2.5 rounded-xl font-bold text-sm transition">
                  Annuler
                </button>
              </div>
            </div>`,
  "boutons regroupes + encaisser sans emoji"
);

// 3. Virer emoji 💳 dans label CREDIT
tryR(
  `CREDIT:   { label: 'À crédit',   bg: 'bg-orange-100', color: 'text-orange-800', icon: '💳' },`,
  `CREDIT:   { label: 'À crédit',   bg: 'bg-orange-100', color: 'text-orange-800', icon: '' },`,
  "retrait emoji credit"
);

// 4. Scroll articles : réduire padding
tryR(
  `<div className="flex-1 overflow-y-auto p-6 space-y-4 bg-slate-50">`,
  `<div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50">`,
  "articles padding compact"
);

fs.writeFileSync(p, s);
console.log(`\nTotal : ${n}/4 patch(es)`);
