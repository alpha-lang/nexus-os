const fs = require("fs");
const p = "app/dashboard/caisse/folios/page.tsx";
let s = fs.readFileSync(p, "utf8");
let n = 0;
function tryR(old, neu, label) {
  if (!s.includes(old)) { console.warn(`  MISS ${label}`); return false; }
  s = s.replace(old, neu); console.log(`  OK ${label}`); n++; return true;
}

// 1. Ajouter option URGENCY dans le select (s'il n'y est pas)
tryR(
  `<option value="ROOM">Trier : N° chambre</option>`,
  `<option value="URGENCY">Trier : Urgence</option>
                <option value="ROOM">Trier : N° chambre</option>`,
  "option URGENCY"
);

// 2. Ajouter badge urgence sur la carte
tryR(
  `                  <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-linear-to-br from-amber-500 to-orange-600 rounded-xl flex items-center justify-center text-white font-black text-lg shadow-md">
                    {f.room?.number}
                  </div>
                  <div>
                    <div className="font-bold text-slate-900 text-sm">
                      {f.customer?.firstName} {f.customer?.lastName}
                    </div>
                    <div className="text-[10px] text-slate-500 font-mono">{f.reference}</div>
                  </div>
                </div>
                {f.solde > 0 ? (
                  <span className="text-[10px] bg-red-100 text-red-700 px-2 py-1 rounded font-bold">À PAYER</span>
                ) : (
                  <span className="text-[10px] bg-green-100 text-green-700 px-2 py-1 rounded font-bold">À JOUR</span>
                )}
              </div>`,
  `                  <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-linear-to-br from-amber-500 to-orange-600 rounded-xl flex items-center justify-center text-white font-black text-lg shadow-md">
                    {f.room?.number}
                  </div>
                  <div>
                    <div className="font-bold text-slate-900 text-sm">
                      {f.customer?.firstName} {f.customer?.lastName}
                    </div>
                    <div className="text-[10px] text-slate-500 font-mono">{f.reference}</div>
                  </div>
                </div>
                {(() => {
                  const d = daysUntil(f.checkOutDate);
                  const meta = urgencyMeta(d, f.solde);
                  return (
                    <span className={\`text-[10px] \${meta.bg} \${meta.text} px-2 py-1 rounded font-bold border \${meta.border}\`}>
                      {meta.label}
                    </span>
                  );
                })()}
              </div>`,
  "badge urgence sur carte"
);

fs.writeFileSync(p, s);
console.log(`\nTotal : ${n}/2 patch(es)`);
