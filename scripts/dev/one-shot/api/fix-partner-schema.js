const fs = require('fs');
const p = 'prisma/schema.prisma';
let s = fs.readFileSync(p, 'utf8');
let n = 0;
function tryR(old, neu, label) {
  if (!s.includes(old)) { console.warn(`  MISS ${label}`); return false; }
  s = s.replace(old, neu); console.log(`  OK ${label}`); n++; return true;
}

console.log('Fix schema Partner...');

// 1. Conflit "notes" dans Partner : renommer CustomerNote[] en customerNotes[]
tryR(
  `  notes          CustomerNote[]
  documents      CustomerDocument[]`,
  `  customerNotes  CustomerNote[]
  documents      CustomerDocument[]`,
  'Partner.notes conflit'
);

// 2. Organization : supprimer stockSuppliers
tryR(
  `  stockSuppliers  StockSupplier[]
`,
  ``,
  'Organization.stockSuppliers'
);

// 3. Organization : customers → partners (ligne 69)
tryR(
  `  customers     Customer[]`,
  `  partners      Partner[]`,
  'Organization.customers'
);

// 4. User : customers → partners (ligne 187)
tryR(
  `  customers             Customer[]`,
  `  partners              Partner[]`,
  'User.customers'
);

// 5. CustomerDocument : customer Customer → Partner
tryR(
  `model CustomerDocument {
  id         String   @id @default(cuid())
  customerId String
  customer   Customer @relation(fields: [customerId], references: [id], onDelete: Cascade)`,
  `model CustomerDocument {
  id         String   @id @default(cuid())
  customerId String
  customer   Partner  @relation(fields: [customerId], references: [id], onDelete: Cascade)`,
  'CustomerDocument FK'
);

// 6. Ajouter le modele Interaction a la fin du schema
if (!s.includes('model Interaction ')) {
  const interaction = `

// ═══════════════════════════════════════════════════════
//  CRM — Interactions partenaires
// ═══════════════════════════════════════════════════════

model Interaction {
  id             String       @id @default(cuid())
  partnerId      String
  partner        Partner      @relation(fields: [partnerId], references: [id], onDelete: Cascade)
  type           String
  subject        String
  content        String?
  duration       Int?
  outcome        String?
  userId         String?
  user           User?        @relation(fields: [userId], references: [id])
  organizationId String
  organization   Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  createdAt      DateTime     @default(now())

  @@index([partnerId, createdAt])
  @@index([organizationId, createdAt])
  @@map("Interaction")
}
`;
  s = s.trimEnd() + interaction;
  console.log('  OK Interaction ajoute');
  n++;
}

// 7. User : ajouter back-relation interactions
tryR(
  `  partners              Partner[]`,
  `  partners              Partner[]
  interactions          Interaction[]`,
  'User.interactions'
);

// 8. Organization : ajouter back-relation interactions
tryR(
  `  partners      Partner[]`,
  `  partners      Partner[]
  interactions  Interaction[]`,
  'Organization.interactions'
);

fs.writeFileSync(p, s);
console.log(`\n✅ ${n} fix`);
