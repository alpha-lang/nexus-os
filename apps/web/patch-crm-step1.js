const fs = require('fs');
const p = 'app/dashboard/crm/[id]/page.tsx';
let s = fs.readFileSync(p, 'utf8');

if (s.includes('isSupplier')) {
  console.log('SKIP - deja patche');
  process.exit(0);
}

// 1. Ajouter helper displayName + detection type apres getTagMeta/parseTags
const anchor = `export default function CustomerDetailPage() {`;

const helpers = `function displayName(p: any): string {
  if (!p) return 'Partenaire';
  if (p.name && p.name !== 'null null') return p.name;
  const full = ((p.firstName || '') + ' ' + (p.lastName || '')).trim();
  return full || 'Partenaire';
}

function getInitials(p: any): string {
  if (p?.firstName && p?.lastName) return (p.firstName[0] + p.lastName[0]).toUpperCase();
  if (p?.name) {
    const parts = p.name.trim().split(' ');
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return p.name.slice(0, 2).toUpperCase();
  }
  return '?';
}

const TYPE_BADGE: Record<string, { label: string; bg: string; text: string; icon: string }> = {
  CUSTOMER: { label: 'CLIENT', bg: 'bg-emerald-500', text: 'text-white', icon: '👤' },
  SUPPLIER: { label: 'FOURNISSEUR', bg: 'bg-cyan-500', text: 'text-white', icon: '🚚' },
  BOTH:     { label: 'PARTENAIRE', bg: 'bg-purple-500', text: 'text-white', icon: '🤝' },
};

export default function CustomerDetailPage() {`;

if (!s.includes(anchor)) { console.error('❌ anchor composant introuvable'); process.exit(1); }
s = s.replace(anchor, helpers);

// 2. Remplacer le calcul initials
s = s.replace(
  `  const initials = \`\${customer.firstName?.charAt(0) || ''}\${customer.lastName?.charAt(0) || ''}\`;`,
  `  const initials = getInitials(customer);
  const isSupplier = customer.type === 'SUPPLIER' || customer.type === 'BOTH';
  const isCustomer = customer.type === 'CUSTOMER' || customer.type === 'BOTH';
  const typeMeta = TYPE_BADGE[customer.type] || TYPE_BADGE.CUSTOMER;
  const fullName = displayName(customer);`
);

fs.writeFileSync(p, s);
console.log('✅ Helpers + detection type ajoutes');
