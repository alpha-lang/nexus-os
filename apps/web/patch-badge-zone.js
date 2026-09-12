const fs = require("fs");
const p = "app/dashboard/caisse/tables/page.tsx";
let s = fs.readFileSync(p, "utf8");
let n = 0;
function tryR(old, neu, label) {
  if (!s.includes(old)) { console.warn(`  MISS ${label}`); return false; }
  s = s.replace(old, neu); console.log(`  OK ${label}`); n++; return true;
}

console.log("Patch badge zone...");

// 1. Helper : code court + couleur par zone
tryR(
  `const STATUS_OPTIONS = [`,
  `const ZONE_SHORT: Record<string, { code: string; bg: string }> = {
  RESTAURANT: { code: 'REST', bg: 'bg-orange-600' },
  TERRACE:    { code: 'TERR', bg: 'bg-green-600' },
  POOL:       { code: 'POOL', bg: 'bg-cyan-600' },
  BAR:        { code: 'BAR',  bg: 'bg-purple-600' },
  LOBBY:      { code: 'LOBBY', bg: 'bg-slate-600' },
};

const STATUS_OPTIONS = [`,
  "helper ZONE_SHORT"
);

// 2. Confort : ajouter badge zone
tryR(
  `                <div className="text-3xl font-black">{t.number}</div>
                <div className="text-xs opacity-90 mt-1">{t.capacity} pl.</div>
              </button>
            ))}
          </div>
        ) : (`,
  `                <div className="text-3xl font-black">{t.number}</div>
                <div className="text-xs opacity-90 mt-1">{t.capacity} pl.</div>
                {locationFilter === 'ALL' && (() => {
                  const z = ZONE_SHORT[t.location] || { code: t.location.slice(0, 4), bg: 'bg-slate-600' };
                  return (
                    <span className={'mt-1.5 text-[8px] font-black tracking-wider px-1.5 py-0.5 rounded ' + z.bg + ' text-white/90'}>
                      {z.code}
                    </span>
                  );
                })()}
              </button>
            ))}
          </div>
        ) : (`,
  "badge confort"
);

// 3. Compact : ajouter code zone en dessous
tryR(
  `                <div className="text-base font-black leading-none">{t.number}</div>
                <div className="text-[9px] opacity-90 mt-0.5">{t.capacity}p</div>
              </button>`,
  `                <div className="text-base font-black leading-none">{t.number}</div>
                <div className="text-[9px] opacity-90 mt-0.5">{t.capacity}p</div>
                {locationFilter === 'ALL' && (() => {
                  const z = ZONE_SHORT[t.location];
                  return (
                    <div className="text-[7px] opacity-70 font-black tracking-wider">{z?.code || t.location.slice(0,3)}</div>
                  );
                })()}
              </button>`,
  "badge compact"
);

fs.writeFileSync(p, s);
console.log(`\nTotal : ${n}/3 patch(es)`);
