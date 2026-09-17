const fs = require("fs");
const p = "app/dashboard/caisse/journal/page.tsx";
let s = fs.readFileSync(p, "utf8");
let n = 0;

function tryR(old, neu, label) {
  if (!s.includes(old)) { console.warn(`  SKIP ${label}`); return false; }
  s = s.replace(old, neu);
  console.log(`  OK ${label}`);
  n++;
  return true;
}

console.log("Patches billetterie...");

// ─── 1. Composant DenomGrid + constantes AVANT le default export ───
if (!s.includes("function DenomGrid")) {
  const grid = `
const DENOMS = [20000, 10000, 5000, 2000, 1000, 500, 200, 100, 50, 20];

function DenomGrid({ value, onChange, accent }: {
  value: Record<string, number>;
  onChange: (v: Record<string, number>) => void;
  accent: 'green' | 'red';
}) {
  const setDenom = (d: number, count: number) => {
    const c = Math.max(0, count);
    const next: Record<string, number> = {};
    Object.entries(value).forEach(([k, v]) => { if (v > 0) next[k] = v; });
    if (c === 0) delete next[String(d)];
    else next[String(d)] = c;
    onChange(next);
  };
  const total = DENOMS.reduce((sum, d) => sum + d * (value[String(d)] || 0), 0);
  const cls = accent === 'green'
    ? { border: 'border-green-300', bg: 'bg-green-50', text: 'text-green-700' }
    : { border: 'border-red-300', bg: 'bg-red-50', text: 'text-red-700' };

  return (
    <div>
      <div className="grid grid-cols-2 gap-2 max-h-72 overflow-y-auto p-1 custom-scrollbar">
        {DENOMS.map(d => {
          const cnt = value[String(d)] || 0;
          return (
            <div key={d} className={\`flex items-center gap-2 bg-white rounded-lg border-2 p-2 transition \${cnt > 0 ? 'border-teal-300 bg-teal-50/40' : 'border-slate-200'}\`}>
              <span className="text-xs font-black text-slate-700 w-14 shrink-0">
                {d.toLocaleString('fr-FR')}
              </span>
              <span className="text-slate-400 text-xs shrink-0">x</span>
              <input
                type="number"
                min="0"
                value={cnt || ''}
                onChange={e => setDenom(d, parseInt(e.target.value) || 0)}
                placeholder="0"
                className="flex-1 min-w-0 px-2 py-1 bg-white border border-slate-200 rounded text-sm font-bold text-slate-900 text-center focus:ring-2 focus:ring-teal-400 focus:border-teal-400"
              />
              <span className="text-[10px] font-black text-slate-500 w-16 text-right shrink-0">
                {(d * cnt).toLocaleString('fr-FR')}
              </span>
            </div>
          );
        })}
      </div>
      <div className={\`mt-3 p-3 rounded-xl border-2 \${cls.border} \${cls.bg} flex items-center justify-between\`}>
        <span className={\`text-[10px] font-black uppercase tracking-widest \${cls.text}\`}>
          Total billetterie
        </span>
        <span className={\`text-2xl font-black \${cls.text}\`}>
          {total.toLocaleString('fr-FR')} <span className="text-sm">Ar</span>
        </span>
      </div>
    </div>
  );
}

export default function JournalCaissePage() {`;
  s = s.replace("export default function JournalCaissePage() {", grid);
  console.log("  OK DenomGrid insere");
  n++;
}

// ─── 2. State openBreakdown / closeBreakdown ───
tryR(
  "const [sessionNotes, setSessionNotes] = useState('');",
  "const [sessionNotes, setSessionNotes] = useState('');\n  const [openBreakdown, setOpenBreakdown] = useState<Record<string, number>>({});\n  const [closeBreakdown, setCloseBreakdown] = useState<Record<string, number>>({});",
  "state breakdown"
);

// ─── 3. openSessionModal : reset openBreakdown ───
tryR(
  "setOpenAmount('0'); setSessionNotes('');",
  "setOpenAmount('0'); setSessionNotes(''); setOpenBreakdown({});",
  "openSessionModal reset"
);

// ─── 4. closeSessionModal : reset closeBreakdown ───
tryR(
  "setCloseAmount(reg.currentBalance.toString());",
  "setCloseAmount(reg.currentBalance.toString()); setCloseBreakdown({});",
  "closeSessionModal reset"
);

// ─── 5. confirmOpen : envoyer openingBreakdown + total ───
tryR(
  "body: JSON.stringify({ openingAmount: openAmount, notes: sessionNotes }),",
  `body: JSON.stringify({
        openingAmount: Object.entries(openBreakdown).reduce((sum, [d, c]) => sum + parseInt(d) * c, 0) || parseFloat(openAmount) || 0,
        openingBreakdown: Object.keys(openBreakdown).length > 0 ? openBreakdown : null,
        notes: sessionNotes,
      }),`,
  "confirmOpen breakdown"
);

// ─── 6. confirmClose : envoyer closingBreakdown + total ───
tryR(
  "body: JSON.stringify({ closingAmount: closeAmount, notes: sessionNotes }),",
  `body: JSON.stringify({
        closingAmount: Object.entries(closeBreakdown).reduce((sum, [d, c]) => sum + parseInt(d) * c, 0) || parseFloat(closeAmount) || 0,
        closingBreakdown: Object.keys(closeBreakdown).length > 0 ? closeBreakdown : null,
        notes: sessionNotes,
      }),`,
  "confirmClose breakdown"
);

// ─── 7. Modale ouverture : remplacer l'input par la grille ───
tryR(
  `<input type="number" value={openAmount} onChange={(e) => setOpenAmount(e.target.value)} className="w-full px-5 py-4 bg-white border-2 border-green-400 rounded-xl font-black text-3xl text-slate-900 text-center" autoFocus />`,
  `<DenomGrid value={openBreakdown} onChange={setOpenBreakdown} accent="green" />`,
  "modal open : DenomGrid"
);

// ─── 8. Modale fermeture : remplacer l'input par la grille ───
tryR(
  `<input type="number" value={closeAmount} onChange={(e) => setCloseAmount(e.target.value)} className="w-full px-5 py-4 bg-white border-2 border-red-400 rounded-xl font-black text-3xl text-slate-900 text-center" autoFocus />`,
  `<DenomGrid value={closeBreakdown} onChange={setCloseBreakdown} accent="red" />`,
  "modal close : DenomGrid"
);

fs.writeFileSync(p, s);
console.log(`\nTotal : ${n} patch(es) applique(s)`);
