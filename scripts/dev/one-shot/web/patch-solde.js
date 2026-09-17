const fs = require("fs");
const p = "app/dashboard/caisse/journal/page.tsx";
let s = fs.readFileSync(p, "utf8");

const old = `                <div className="bg-slate-50 rounded-xl p-4 mb-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600">Solde theorique</span>
                    <span className="font-black">{currentRegister.currentBalance.toLocaleString('fr-FR')} Ar</span>
                  </div>
                </div>`;

const neu = `                <div className="bg-slate-900 rounded-xl p-4 mb-4 text-white">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest mb-1">Solde theorique</p>
                      <p className="text-xs text-slate-500">Calcule a partir des mouvements</p>
                    </div>
                    <span className="text-2xl font-black text-teal-400 tabular-nums">
                      {(currentRegister.currentBalance || 0).toLocaleString('fr-FR')}
                      <span className="text-sm text-slate-400 ml-1">Ar</span>
                    </span>
                  </div>
                </div>`;

if (!s.includes(old)) { console.error("❌ anchor introuvable"); process.exit(1); }
s = s.replace(old, neu);
fs.writeFileSync(p, s);
console.log("✅ solde theorique plus visible + fallback");
