const fs = require('fs');
const p = 'app/dashboard/crm/page.tsx';
let s = fs.readFileSync(p, 'utf8');

if (s.includes('Nouveau partenaire</h1>') || s.includes('submitCreate')) {
  if (!s.includes('onClick={openCreate}')) {
    // Continue pour le JSX
  } else {
    console.log('SKIP - JSX deja patche');
    process.exit(0);
  }
}

let n = 0;
function tryR(old, neu, label) {
  if (!s.includes(old)) { console.warn(`  MISS ${label}`); return false; }
  s = s.replace(old, neu); console.log(`  OK ${label}`); n++; return true;
}

// 1. Bouton "+ Nouveau" dans le header
tryR(
  `        <div>
          <p className="text-xs font-black text-teal-600 uppercase tracking-widest mb-1">Relation client</p>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">CRM</h1>
          <p className="text-slate-500 mt-1">
            {counts.CUSTOMER} client{counts.CUSTOMER > 1 ? 's' : ''} · {counts.SUPPLIER} fournisseur{counts.SUPPLIER > 1 ? 's' : ''} · {counts.ALL} partenaire{counts.ALL > 1 ? 's' : ''}
          </p>
        </div>
      </div>`,
  `        <div>
          <p className="text-xs font-black text-teal-600 uppercase tracking-widest mb-1">Relation client</p>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">CRM</h1>
          <p className="text-slate-500 mt-1">
            {counts.CUSTOMER} client{counts.CUSTOMER > 1 ? 's' : ''} · {counts.SUPPLIER} fournisseur{counts.SUPPLIER > 1 ? 's' : ''} · {counts.ALL} partenaire{counts.ALL > 1 ? 's' : ''}
          </p>
        </div>
        <Button
          onClick={openCreate}
          icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"/></svg>}
        >
          Nouveau partenaire
        </Button>
      </div>`,
  'bouton nouveau'
);

// 2. Ajouter modale + toast juste avant la fin du composant (avant dernier </div>)
const endMarker = `    </div>
  );
}
`;
const modal = `      {toast && (
        <div className="fixed top-20 right-4 z-[100] bg-slate-900 text-white px-4 py-3 rounded-xl shadow-2xl text-sm font-medium">
          {toast}
        </div>
      )}

      <Modal
        open={showCreate}
        onClose={() => { setShowCreate(false); resetForm(); }}
        title="Nouveau partenaire"
        subtitle="Creez un client, fournisseur ou les deux"
        icon={<span className="text-2xl font-bold">+</span>}
        size="md"
        footer={
          <div className="flex gap-3">
            <Button variant="secondary" onClick={() => { setShowCreate(false); resetForm(); }}>Annuler</Button>
            <button
              type="submit"
              form="create-partner-form"
              disabled={saving}
              className="flex-1 bg-linear-to-r from-blue-600 to-teal-500 text-white py-2.5 rounded-xl font-semibold hover:shadow-lg transition disabled:opacity-50"
            >
              {saving ? 'Creation...' : 'Creer le partenaire'}
            </button>
          </div>
        }
      >
        <form id="create-partner-form" onSubmit={submitCreate} className="space-y-4">
          {error && <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">{error}</div>}

          <FormField label="Type de partenaire" required>
            <div className="grid grid-cols-3 gap-2">
              {[
                { v: 'CUSTOMER' as const, l: 'Client', i: '👤' },
                { v: 'SUPPLIER' as const, l: 'Fournisseur', i: '🚚' },
                { v: 'BOTH' as const, l: 'Les deux', i: '🤝' },
              ].map(t => (
                <button
                  key={t.v}
                  type="button"
                  onClick={() => setNType(t.v)}
                  className={'py-2.5 rounded-xl text-sm font-bold border-2 transition ' + (
                    nType === t.v ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-700 border-slate-300 hover:border-slate-400'
                  )}
                >
                  {t.i} {t.l}
                </button>
              ))}
            </div>
          </FormField>

          <FormField label={nType === 'CUSTOMER' ? 'Nom complet' : 'Raison sociale'} required>
            <Input type="text" value={nName} onChange={e => setNName(e.target.value)} placeholder={nType === 'CUSTOMER' ? 'Jean Dupont' : 'Metro Tana'} required />
          </FormField>

          {nType === 'CUSTOMER' && (
            <div className="grid grid-cols-2 gap-3">
              <FormField label="Prenom">
                <Input type="text" value={nFirstName} onChange={e => setNFirstName(e.target.value)} placeholder="Jean" />
              </FormField>
              <FormField label="Nom">
                <Input type="text" value={nLastName} onChange={e => setNLastName(e.target.value)} placeholder="Dupont" />
              </FormField>
            </div>
          )}

          {nType !== 'CUSTOMER' && (
            <div className="grid grid-cols-2 gap-3">
              <FormField label="Contact principal">
                <Input type="text" value={nContactName} onChange={e => setNContactName(e.target.value)} placeholder="Jean Paul" />
              </FormField>
              <FormField label="Delai livraison (jours)">
                <Input type="number" value={nLeadTimeDays} onChange={e => setNLeadTimeDays(e.target.value)} placeholder="2" min="0" />
              </FormField>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <FormField label="Email">
              <Input type="email" value={nEmail} onChange={e => setNEmail(e.target.value)} placeholder="contact@email.mg" />
            </FormField>
            <FormField label="Telephone">
              <Input type="text" value={nPhone} onChange={e => setNPhone(e.target.value)} placeholder="+261 34 12 345 67" />
            </FormField>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <FormField label="Ville">
              <Input type="text" value={nCity} onChange={e => setNCity(e.target.value)} placeholder="Antananarivo" />
            </FormField>
            <FormField label="Adresse">
              <Input type="text" value={nAddress} onChange={e => setNAddress(e.target.value)} placeholder="Lot II M 12 Bis" />
            </FormField>
          </div>
        </form>
      </Modal>
    </div>
  );
}
`;

if (!s.includes(endMarker)) { console.error('❌ marker fin introuvable'); process.exit(1); }
s = s.replace(endMarker, modal);

fs.writeFileSync(p, s);
console.log(`\n✅ ${n}/2 patch(es) JSX`);
