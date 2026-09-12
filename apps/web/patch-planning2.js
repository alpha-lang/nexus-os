const fs = require("fs");
const p = "app/dashboard/reservations/planning/page.tsx";
let s = fs.readFileSync(p, "utf8");

const oldHeader = `                    <div className="text-[10px] text-slate-400">
                      {d.toLocaleDateString('fr-FR', { month: 'short' })}
                    </div>
                  </div>`;

const newHeader = `                    <div className="text-[10px] text-slate-400">
                      {d.toLocaleDateString('fr-FR', { month: 'short' })}
                    </div>
                    {(() => {
                      const count = reservations.filter(r => {
                        const ci = startOfDay(new Date(r.checkInDate));
                        const co = startOfDay(new Date(r.checkOutDate));
                        return d.getTime() >= ci.getTime() && d.getTime() < co.getTime();
                      }).length;
                      const pct = rooms.length > 0 ? count / rooms.length : 0;
                      const cls = pct >= 0.9 ? 'bg-red-500 text-white'
                        : pct >= 0.6 ? 'bg-amber-400 text-slate-900'
                        : count > 0 ? 'bg-teal-500 text-white'
                        : 'bg-slate-200 text-slate-500';
                      return (
                        <div className={\`mt-1 text-[10px] font-black rounded-md px-1.5 py-0.5 \${cls}\`}>
                          {count}/{rooms.length}
                        </div>
                      );
                    })()}
                  </div>`;

if (!s.includes(oldHeader)) {
  console.error("❌ anchor introuvable");
  process.exit(1);
}
s = s.replace(oldHeader, newHeader);
fs.writeFileSync(p, s);
console.log("✅ badge charge quotidienne insere");
