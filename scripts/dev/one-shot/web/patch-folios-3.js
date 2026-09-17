const fs = require("fs");
const p = "app/dashboard/caisse/folios/page.tsx";
let s = fs.readFileSync(p, "utf8");
let n = 0;
function tryR(old, neu, label) {
  if (!s.includes(old)) { console.warn(`  MISS ${label}`); return false; }
  s = s.replace(old, neu); console.log(`  OK ${label}`); n++; return true;
}

// 1. Ajouter option URGENCY en tete du select
tryR(
  `<option value="ROOM" className="text-slate-900">Trier : N° chambre</option>`,
  `<option value="URGENCY" className="text-slate-900">Trier : Urgence</option>
            <option value="ROOM" className="text-slate-900">Trier : N° chambre</option>`,
  "option URGENCY"
);

// 2. Badge urgence : remplacer le ternaire "À PAYER / À JOUR"
tryR(
  `{f.solde > 0 ? (
                  <span className="text-[10px] bg-red-100 text-red-700 px-2 py-1 rounded font-bold">À PAYER</span>
                ) : (
                  <span className="text-[10px] bg-green-100 text-green-700 px-2 py-1 rounded font-bold">À JOUR</span>
                )}`,
  `{(() => {
                  const d = daysUntil(f.checkOutDate);
                  const meta = urgencyMeta(d, f.solde);
                  return (
                    <span className={'text-[10px] ' + meta.bg + ' ' + meta.text + ' px-2 py-1 rounded font-bold border ' + meta.border}>
                      {meta.label}
                    </span>
                  );
                })()}`,
  "badge urgence sur carte"
);

fs.writeFileSync(p, s);
console.log(`\nTotal : ${n}/2 patch(es)`);
