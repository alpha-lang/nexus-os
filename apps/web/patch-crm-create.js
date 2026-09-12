const fs = require('fs');
const p = 'app/dashboard/crm/page.tsx';
let s = fs.readFileSync(p, 'utf8');

if (s.includes('showCreateModal')) {
  console.log('SKIP - deja patche');
  process.exit(0);
}

let n = 0;
function tryR(old, neu, label) {
  if (!s.includes(old)) { console.warn(`  MISS ${label}`); return false; }
  s = s.replace(old, neu); console.log(`  OK ${label}`); n++; return true;
}

// 1. Import Modal + composants UI
tryR(
  `import { usePagination } from '../../../lib/usePagination';`,
  `import { usePagination } from '../../../lib/usePagination';
import { Modal, Button, FormField, Input, Select, Textarea } from '../../../components/ui';`,
  'imports UI'
);

// 2. States modale
tryR(
  `  const [sortBy, setSortBy] = useState<'name' | 'recent' | 'score'>('name');`,
  `  const [sortBy, setSortBy] = useState<'name' | 'recent' | 'score'>('name');
  const [showCreate, setShowCreate] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const [nType, setNType] = useState<'CUSTOMER' | 'SUPPLIER' | 'BOTH'>('CUSTOMER');
  const [nName, setNName] = useState('');
  const [nFirstName, setNFirstName] = useState('');
  const [nLastName, setNLastName] = useState('');
  const [nEmail, setNEmail] = useState('');
  const [nPhone, setNPhone] = useState('');
  const [nAddress, setNAddress] = useState('');
  const [nCity, setNCity] = useState('');
  const [nContactName, setNContactName] = useState('');
  const [nLeadTimeDays, setNLeadTimeDays] = useState('');`,
  'states modale'
);

// 3. Helper reset + submit apres load()
tryR(
  `  useEffect(() => { load().catch(console.error).finally(() => setLoading(false)); }, []);`,
  `  useEffect(() => { load().catch(console.error).finally(() => setLoading(false)); }, []);

  function showToast(msg: string) { setToast(msg); setTimeout(() => setToast(null), 2500); }

  function resetForm() {
    setNType('CUSTOMER');
    setNName(''); setNFirstName(''); setNLastName('');
    setNEmail(''); setNPhone(''); setNAddress(''); setNCity('');
    setNContactName(''); setNLeadTimeDays('');
    setError(null);
  }

  function openCreate() { resetForm(); setShowCreate(true); }

  async function submitCreate(e: React.FormEvent) {
    e.preventDefault();
    setError(null); setSaving(true);
    const res = await fetch('/api/partners', {
      method: 'POST',
      headers: { Authorization: \`Bearer \${token}\`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: nType,
        name: nName,
        firstName: nFirstName,
        lastName: nLastName,
        email: nEmail,
        phone: nPhone,
        address: nAddress,
        city: nCity,
        contactName: nContactName,
        leadTimeDays: nLeadTimeDays,
      }),
    });
    setSaving(false);
    if (res.ok) {
      const created = await res.json();
      showToast('Partenaire cree : ' + created.name);
      setShowCreate(false);
      resetForm();
      await load();
    } else {
      const d = await res.json();
      setError(d.message || 'Erreur');
    }
  }`,
  'helpers create'
);

fs.writeFileSync(p, s);
console.log(`\n✅ ${n}/3 patch(es) etape 1`);
