const fs = require("fs");
const p = "app/dashboard/stock/orders/page.tsx";
let s = fs.readFileSync(p, "utf8");

// Rendre chaque carte cliquable sauf les boutons d'action
const old = `              <div key={o.id} className="bg-white rounded-2xl border border-slate-200 overflow-hidden hover:shadow-md transition">
                <div className="flex items-center gap-4 p-4">`;

const neu = `              <div key={o.id} className="bg-white rounded-2xl border border-slate-200 overflow-hidden hover:shadow-md transition">
                <a
                  href={'/dashboard/stock/orders/' + o.id}
                  className="flex items-center gap-4 p-4 hover:bg-slate-50 transition cursor-pointer"
                >`;

const old2 = `                  <div className="text-right shrink-0">
                    <p className="text-lg font-black text-slate-900 tabular-nums">{o.totalAmount.toLocaleString('fr-FR')} Ar</p>
                    {o.expectedDate && (
                      <p className="text-[10px] text-slate-500">Attendu {new Date(o.expectedDate).toLocaleDateString('fr-FR')}</p>
                    )}
                  </div>
                </div>`;

const neu2 = `                  <div className="text-right shrink-0">
                    <p className="text-lg font-black text-slate-900 tabular-nums">{o.totalAmount.toLocaleString('fr-FR')} Ar</p>
                    {o.expectedDate && (
                      <p className="text-[10px] text-slate-500">Attendu {new Date(o.expectedDate).toLocaleDateString('fr-FR')}</p>
                    )}
                  </div>
                  <svg className="w-5 h-5 text-slate-300 group-hover:text-slate-500 transition shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"/>
                  </svg>
                </a>`;

if (!s.includes(old)) { console.error("❌ anchor 1 introuvable"); process.exit(1); }
if (!s.includes(old2)) { console.error("❌ anchor 2 introuvable"); process.exit(1); }

s = s.replace(old, neu);
s = s.replace(old2, neu2);
fs.writeFileSync(p, s);
console.log("✅ Lien vers page detail ajoute");
