const fs = require("fs");
const p = "app/dashboard/modules/page.tsx";
let s = fs.readFileSync(p, "utf8");
let n = 0;
function tryR(old, neu, label) {
  if (!s.includes(old)) { console.warn(`  MISS ${label}`); return false; }
  s = s.replace(old, neu); console.log(`  OK ${label}`); n++; return true;
}

console.log("Patch modale modules...");

tryR(
  `  const [price, setPrice] = useState('');`,
  `  const [price, setPrice] = useState('');
  const [pricing, setPricing] = useState<Record<string, string>>({});`,
  "state pricing"
);

tryR(
  `    setName(''); setTypes([]); setDescription(''); setPrice('');
    setStatus('ACTIVE'); setRoute(''); setRouteManuallyEdited(false);
    setError(null); setEditing(null);`,
  `    setName(''); setTypes([]); setDescription(''); setPrice('');
    setPricing({});
    setStatus('ACTIVE'); setRoute(''); setRouteManuallyEdited(false);
    setError(null); setEditing(null);`,
  "reset pricing"
);

tryR(
  `    setPrice(m.price?.toString() || '');
    setStatus(m.status || 'ACTIVE');`,
  `    setPrice(m.price?.toString() || '');
    if (m.pricing && typeof m.pricing === 'object') {
      const p: Record<string, string> = {};
      Object.entries(m.pricing).forEach(([k, v]) => { p[k] = String(v); });
      setPricing(p);
    } else {
      setPricing({});
    }
    setStatus(m.status || 'ACTIVE');`,
  "openEdit pricing"
);

tryR(
  `  function toggleType(t: string) {
    setTypes(prev => prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t]);
  }`,
  `  function toggleType(t: string) {
    setTypes(prev => {
      const next = prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t];
      setPricing(p => {
        const out = { ...p };
        if (!next.includes(t)) delete out[t];
        return out;
      });
      return next;
    });
  }

  function setPricingField(type: string, value: string) {
    setPricing(p => ({ ...p, [type]: value }));
  }`,
  "toggleType + setter pricing"
);

tryR(
  `      body: JSON.stringify({ name, types, description, price: parseFloat(price) || 0, status, route }),`,
  `      body: JSON.stringify({
        name, types, description,
        price: parseFloat(price) || 0,
        pricing: Object.keys(pricing).length > 0
          ? Object.fromEntries(
              Object.entries(pricing)
                .filter(([, v]) => v !== '')
                .map(([k, v]) => [k, parseFloat(v) || 0])
            )
          : null,
        status, route,
      }),`,
  "save envoie pricing"
);

tryR(
  `          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-1 h-4 bg-linear-to-b from-blue-500 to-teal-500 rounded-full"></div>
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Ciblage</h3>
            </div>
            <FormField label="Types d entreprise cibles" hint="Aucun coche = universel">
              <div className="border border-gray-200 rounded-xl p-3 grid grid-cols-2 gap-2">
                {AVAILABLE_TYPES.map(t => (
                  <label key={t} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={types.includes(t)}
                      onChange={() => toggleType(t)}
                      className="w-4 h-4 text-teal-600 rounded focus:ring-teal-500"
                    />
                    <span className="text-sm text-slate-700">{t}</span>
                  </label>
                ))}
              </div>
            </FormField>
          </div>`,
  `          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-1 h-4 bg-linear-to-b from-blue-500 to-teal-500 rounded-full"></div>
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Ciblage et prix par type</h3>
            </div>
            <div className="border border-gray-200 rounded-xl p-3 space-y-2">
              {AVAILABLE_TYPES.map(t => (
                <div
                  key={t}
                  className={'flex items-center gap-3 p-2 rounded-lg transition ' + (types.includes(t) ? 'bg-teal-50' : 'hover:bg-slate-50')}
                >
                  <label className="flex items-center gap-2 cursor-pointer flex-1 min-w-0">
                    <input
                      type="checkbox"
                      checked={types.includes(t)}
                      onChange={() => toggleType(t)}
                      className="w-4 h-4 text-teal-600 rounded focus:ring-teal-500 shrink-0"
                    />
                    <span className="text-sm font-bold text-slate-700">{t}</span>
                  </label>
                  {types.includes(t) && (
                    <div className="flex items-center gap-2 shrink-0">
                      <input
                        type="number"
                        placeholder={price || '0'}
                        value={pricing[t] ?? ''}
                        onChange={e => setPricingField(t, e.target.value)}
                        className="w-28 px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-sm font-bold text-slate-900 tabular-nums focus:ring-2 focus:ring-teal-400 focus:border-teal-400"
                      />
                      <span className="text-xs font-bold text-slate-500">Ar</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
            <p className="text-xs text-slate-400 mt-2">
              {types.length === 0
                ? 'Aucun coche = module universel (prix unique ci-dessous)'
                : 'Prix specifiques par type. Laisser vide = utilise le prix universel.'}
            </p>
          </div>`,
  "JSX ciblage + prix"
);

tryR(
  `                <FormField label="Prix (Ar)">
                  <Input type="number" value={price} onChange={e => setPrice(e.target.value)} placeholder="30000" />
                </FormField>`,
  `                <FormField label={types.length > 0 ? 'Prix universel de secours (Ar)' : 'Prix (Ar)'}>
                  <Input type="number" value={price} onChange={e => setPrice(e.target.value)} placeholder="30000" />
                </FormField>`,
  "label prix dynamique"
);

fs.writeFileSync(p, s);
console.log(`\nTotal : ${n}/7 patch(es)`);
