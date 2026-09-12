const fs = require("fs");
const p = "app/dashboard/reservations/housekeeping/page.tsx";
let s = fs.readFileSync(p, "utf8");
let n = 0;
function tryR(old, neu, label) {
  if (!s.includes(old)) { console.warn(`  MISS ${label}`); return false; }
  s = s.replace(old, neu); console.log(`  OK ${label}`); n++; return true;
}

console.log("Patch housekeeping...");

// 1. States additionnels
tryR(
  `  const [filter, setFilter] = useState('');`,
  `  const [filter, setFilter] = useState('');
  const [search, setSearch] = useState('');
  const [agentFilter, setAgentFilter] = useState<string>('ALL');
  const [sort, setSort] = useState<'priority' | 'dueDate' | 'created'>('priority');
  const [toast, setToast] = useState<string | null>(null);`,
  "states additionnels"
);

// 2. Toast helper avant load()
tryR(
  `  async function load() {`,
  `  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  }

  async function load() {`,
  "helper toast"
);

// 3. Notif apres quickStatus
tryR(
  `  async function quickStatus(task: any, newStatus: string) {
    await fetch(\`/api/hotel/housekeeping/\${task.id}\`, {
      method: 'PATCH',
      headers: { Authorization: \`Bearer \${token}\`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus }),
    });
    await load();
  }`,
  `  async function quickStatus(task: any, newStatus: string) {
    await fetch(\`/api/hotel/housekeeping/\${task.id}\`, {
      method: 'PATCH',
      headers: { Authorization: \`Bearer \${token}\`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus }),
    });
    const labels: Record<string, string> = {
      PENDING: 'remise a faire',
      IN_PROGRESS: 'demarree',
      DONE: 'terminee',
      VERIFIED: 'verifiee',
    };
    showToast(\`Ch. \${task.room?.number} : \${labels[newStatus] || newStatus}\`);
    await load();
  }`,
  "toast quickStatus"
);

// 4. Enrichir filtered avec search + agent + tri priorite
tryR(
  `  const filtered = filter ? tasks.filter((t) => t.status === filter) : tasks;`,
  `  const PRIORITY_ORDER: Record<string, number> = { URGENT: 0, HIGH: 1, NORMAL: 2, LOW: 3 };

  const filtered = (() => {
    let list = [...tasks];

    // Statut (filtre onglet)
    if (filter) list = list.filter((t) => t.status === filter);

    // Agent assigne
    if (agentFilter !== 'ALL') {
      if (agentFilter === 'UNASSIGNED') list = list.filter((t) => !t.assignedToId);
      else list = list.filter((t) => t.assignedToId === agentFilter);
    }

    // Recherche
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((t) => {
        const room = (t.room?.number || '').toLowerCase();
        const notes = (t.notes || '').toLowerCase();
        const agent = \`\${t.assignedTo?.name || ''} \${t.assignedTo?.email || ''}\`.toLowerCase();
        return room.includes(q) || notes.includes(q) || agent.includes(q);
      });
    }

    // Tri
    list.sort((a, b) => {
      if (sort === 'priority') {
        const pa = PRIORITY_ORDER[a.priority] ?? 99;
        const pb = PRIORITY_ORDER[b.priority] ?? 99;
        if (pa !== pb) return pa - pb;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
      if (sort === 'dueDate') {
        const da = a.dueDate ? new Date(a.dueDate).getTime() : Infinity;
        const db = b.dueDate ? new Date(b.dueDate).getTime() : Infinity;
        return da - db;
      }
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    return list;
  })();`,
  "filtered enrichi"
);

// 5. Ajouter compteur total restaure + retard dans les KPIs
tryR(
  `  const pendingCount = tasks.filter((t) => t.status === 'PENDING').length;
  const progressCount = tasks.filter((t) => t.status === 'IN_PROGRESS').length;
  const doneCount = tasks.filter((t) => t.status === 'DONE' || t.status === 'VERIFIED').length;`,
  `  const pendingCount = tasks.filter((t) => t.status === 'PENDING').length;
  const progressCount = tasks.filter((t) => t.status === 'IN_PROGRESS').length;
  const doneCount = tasks.filter((t) => t.status === 'DONE' || t.status === 'VERIFIED').length;

  const now = Date.now();
  const overdueCount = tasks.filter((t) =>
    t.dueDate && new Date(t.dueDate).getTime() < now && t.status !== 'DONE' && t.status !== 'VERIFIED'
  ).length;`,
  "compteur retard"
);

// 6. Barre de recherche + tri + filtre agent AVANT les chips
tryR(
  `      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-2 flex flex-wrap gap-1">
        {[
          { v: '', l: \`Toutes (\${tasks.length})\` },`,
  `      {toast && (
        <div className="fixed top-20 right-4 z-[100] bg-slate-900 text-white px-4 py-3 rounded-xl shadow-2xl text-sm font-medium">
          {toast}
        </div>
      )}

      {/* Barre recherche + tri + filtre agent */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-3 space-y-3">
        <div className="relative">
          <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
            </svg>
          </span>
          <input
            type="text"
            placeholder="Rechercher par chambre, agent, notes..."
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
        <div className="flex flex-wrap gap-2">
          <select
            value={agentFilter}
            onChange={e => setAgentFilter(e.target.value)}
            className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-700 cursor-pointer"
          >
            <option value="ALL">Tous les agents</option>
            <option value="UNASSIGNED">Non assigne</option>
            {users.map((u: any) => (
              <option key={u.id} value={u.id}>{u.name || u.email}</option>
            ))}
          </select>
          <select
            value={sort}
            onChange={e => setSort(e.target.value as any)}
            className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-700 cursor-pointer"
          >
            <option value="priority">Priorite</option>
            <option value="dueDate">Echeance</option>
            <option value="created">Plus recent</option>
          </select>
          {overdueCount > 0 && (
            <span className="ml-auto inline-flex items-center gap-1.5 text-xs font-bold text-red-700 bg-red-50 border border-red-200 px-2.5 py-1.5 rounded-lg">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span>
              {overdueCount} en retard
            </span>
          )}
          {(search || agentFilter !== 'ALL') && (
            <button
              onClick={() => { setSearch(''); setAgentFilter('ALL'); }}
              className="text-xs text-teal-600 hover:underline font-bold"
            >
              Effacer
            </button>
          )}
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-2 flex flex-wrap gap-1">
        {[
          { v: '', l: \`Toutes (\${tasks.length})\` },`,
  "barre recherche + agent + tri"
);

fs.writeFileSync(p, s);
console.log(`\nTotal : ${n}/6 patch(es)`);
