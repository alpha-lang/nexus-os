const fs = require("fs");
const p = "app/dashboard/reservations/checkin/page.tsx";
let s = fs.readFileSync(p, "utf8");
let n = 0;
function tryR(old, neu, label) {
  if (!s.includes(old)) { console.warn(`  MISS ${label}`); return false; }
  s = s.replace(old, neu); console.log(`  OK ${label}`); n++; return true;
}

console.log("Patch checkin...");

// 1. State search + toast
tryR(
  `  const [tab, setTab] = useState<Tab>('arrivals');`,
  `  const [tab, setTab] = useState<Tab>('arrivals');
  const [search, setSearch] = useState('');
  const [toast, setToast] = useState<string | null>(null);`,
  "state search + toast"
);

// 2. Toast helper
tryR(
  `  async function doCheckIn(r: any) {`,
  `  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  }

  async function doCheckIn(r: any) {`,
  "helper toast"
);

// 3. Notifs apres check-in / check-out
tryR(
  `    await load();
    setActionLoading(null);
    setSelected(null);
  }

  async function doCheckOut(r: any) {`,
  `    await load();
    setActionLoading(null);
    setSelected(null);
    showToast(\`Check-in OK : \${r.customer?.firstName || ''} \${r.customer?.lastName || ''} - Ch. \${r.room?.number}\`);
  }

  async function doCheckOut(r: any) {`,
  "toast check-in"
);

tryR(
  `    await load();
    setActionLoading(null);
    setSelected(null);
  }

  function nights(r: any) {`,
  `    await load();
    setActionLoading(null);
    setSelected(null);
    showToast(\`Check-out OK : Ch. \${r.room?.number} liberee\`);
  }

  function nights(r: any) {`,
  "toast check-out"
);

// 4. Filtrer currentList par search
tryR(
  `  const currentList = tab === 'arrivals' ? arrivals : tab === 'departures' ? departures : inhouse;`,
  `  const baseList = tab === 'arrivals' ? arrivals : tab === 'departures' ? departures : inhouse;
  const currentList = search.trim()
    ? baseList.filter((r: any) => {
        const q = search.toLowerCase();
        const name = \`\${r.customer?.firstName || ''} \${r.customer?.lastName || ''}\`.toLowerCase();
        const ref = (r.reference || '').toLowerCase();
        const room = (r.room?.number || '').toLowerCase();
        return name.includes(q) || ref.includes(q) || room.includes(q);
      })
    : baseList;

  const totalDue = currentList.reduce((sum: number, r: any) => sum + Math.max(0, (r.totalAmount || 0) - (r.paidAmount || 0)), 0);`,
  "currentList + totalDue"
);

// 5. Insérer la recherche + totaux apres PageHeader
tryR(
  `      <PageHeader
        title="Check-in / Check-out"
        subtitle={new Date().toLocaleDateString('fr-FR', {
          weekday: 'long',
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        })}
      />`,
  `      <PageHeader
        title="Check-in / Check-out"
        subtitle={new Date().toLocaleDateString('fr-FR', {
          weekday: 'long',
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        })}
      />

      {toast && (
        <div className="fixed top-20 right-4 z-[100] bg-slate-900 text-white px-4 py-3 rounded-xl shadow-2xl text-sm font-medium">
          {toast}
        </div>
      )}

      {/* Recherche + total reste du */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-3">
        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
          <div className="relative flex-1">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
              </svg>
            </span>
            <input
              type="text"
              placeholder="Rechercher par nom, reference, chambre..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:ring-2 focus:ring-teal-400 focus:border-teal-400 focus:bg-white transition"
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
          <div className="flex items-center gap-4 shrink-0">
            <div className="text-right">
              <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest">A traiter</p>
              <p className="text-lg font-black text-slate-900 tabular-nums">{currentList.length}</p>
            </div>
            {totalDue > 0 && (
              <div className="text-right pl-4 border-l border-slate-200">
                <p className="text-[10px] text-red-600 uppercase font-black tracking-widest">Reste a encaisser</p>
                <p className="text-lg font-black text-red-600 tabular-nums">{totalDue.toLocaleString('fr-FR')} Ar</p>
              </div>
            )}
          </div>
        </div>
      </div>`,
  "barre recherche + totaux"
);

fs.writeFileSync(p, s);
console.log(`\nTotal : ${n}/5 patch(es)`);
