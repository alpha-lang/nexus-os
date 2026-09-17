const fs = require("fs");
const p = "app/dashboard/caisse/journal/page.tsx";
let s = fs.readFileSync(p, "utf8");

// Trouve la barre de recherche existante et injecte les presets + type
const old = `          <div className="bg-white rounded-xl border border-slate-200 p-3 flex flex-wrap gap-2 items-center">
            <div className="relative flex-1 min-w-50">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Rechercher motif, reference, caisse..."
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium focus:ring-2 focus:ring-teal-400"
              />
            </div>
            <select
              value={selectedRegister}
              onChange={(e) => setSelectedRegister(e.target.value)}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-bold"
            >
              <option value="">Toutes les caisses</option>
              {registers.map((r) => (
                <option key={r.id} value={r.id}>{r.name}</option>
              ))}
            </select>
          </div>`;

const neu = `          <div className="space-y-3">
            {/* Row 1 : recherche + caisse */}
            <div className="bg-white rounded-xl border border-slate-200 p-3 flex flex-wrap gap-2 items-center">
              <div className="relative flex-1 min-w-50">
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Rechercher motif, reference, caisse..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium focus:ring-2 focus:ring-teal-400"
                />
                {search && (
                  <button
                    onClick={() => setSearch('')}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-700"
                  >
                    ✕
                  </button>
                )}
              </div>
              <select
                value={selectedRegister}
                onChange={(e) => setSelectedRegister(e.target.value)}
                className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-bold cursor-pointer"
              >
                <option value="">Toutes les caisses</option>
                {registers.map((r) => (
                  <option key={r.id} value={r.id}>{r.name}</option>
                ))}
              </select>
            </div>

            {/* Row 2 : presets + type */}
            <div className="bg-white rounded-xl border border-slate-200 p-3 flex flex-wrap items-center gap-2">
              {([
                { v: 'today', l: "Aujourd'hui" },
                { v: 'week', l: '7 jours' },
                { v: 'month', l: '30 jours' },
                { v: 'all', l: 'Tout' },
              ] as const).map((p) => (
                <button
                  key={p.v}
                  onClick={() => setMvtPreset(p.v)}
                  className={'px-3 py-1.5 rounded-lg text-xs font-bold transition ' + (
                    mvtPreset === p.v ? 'bg-slate-900 text-white shadow' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  )}
                >
                  {p.l}
                </button>
              ))}
              <span className="w-px h-5 bg-slate-200 mx-1"></span>
              {([
                { v: 'ALL', l: 'Tous' },
                { v: 'IN', l: 'Entrees' },
                { v: 'OUT', l: 'Sorties' },
                { v: 'SALE', l: 'Ventes' },
                { v: 'ADJUSTMENT', l: 'Ajustements' },
              ] as const).map((t) => (
                <button
                  key={t.v}
                  onClick={() => setMvtType(t.v)}
                  className={'px-3 py-1.5 rounded-lg text-xs font-bold transition ' + (
                    mvtType === t.v ? 'bg-slate-900 text-white shadow' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  )}
                >
                  {t.l}
                </button>
              ))}
            </div>

            {/* Row 3 : bandeau totaux periode */}
            {mvtTotals.count > 0 && (
              <div className="bg-slate-900 rounded-xl px-4 py-3 text-white flex flex-wrap items-center gap-4 text-xs">
                <div>
                  <span className="text-[9px] text-slate-400 uppercase font-black tracking-widest block">Mouvements</span>
                  <span className="text-sm font-black tabular-nums">{mvtTotals.count}</span>
                </div>
                <span className="w-px h-6 bg-slate-700"></span>
                <div>
                  <span className="text-[9px] text-slate-400 uppercase font-black tracking-widest block">Entrees</span>
                  <span className="text-sm font-black text-emerald-400 tabular-nums">+{mvtTotals.inAmt.toLocaleString('fr-FR')} Ar</span>
                </div>
                <span className="w-px h-6 bg-slate-700"></span>
                <div>
                  <span className="text-[9px] text-slate-400 uppercase font-black tracking-widest block">Sorties</span>
                  <span className="text-sm font-black text-red-400 tabular-nums">-{mvtTotals.outAmt.toLocaleString('fr-FR')} Ar</span>
                </div>
                <span className="w-px h-6 bg-slate-700"></span>
                <div className="ml-auto">
                  <span className="text-[9px] text-slate-400 uppercase font-black tracking-widest block">Net</span>
                  <span className={'text-lg font-black tabular-nums ' + (mvtTotals.net >= 0 ? 'text-teal-400' : 'text-red-400')}>
                    {mvtTotals.net >= 0 ? '+' : ''}{mvtTotals.net.toLocaleString('fr-FR')} Ar
                  </span>
                </div>
              </div>
            )}
          </div>`;

if (!s.includes(old)) { console.error("❌ anchor recherche mouvements introuvable"); process.exit(1); }
s = s.replace(old, neu);
fs.writeFileSync(p, s);
console.log("✅ filtres + totaux UI ajoutes");
