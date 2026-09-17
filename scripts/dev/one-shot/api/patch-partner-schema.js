const fs = require('fs');
const p = 'prisma/schema.prisma';
let s = fs.readFileSync(p, 'utf8');
let n = 0;
function tryR(old, neu, label) {
  if (!s.includes(old)) { console.warn(`  MISS ${label}`); return false; }
  s = s.replace(old, neu); console.log(`  OK ${label}`); n++; return true;
}

console.log('Patch Partner unification...');

// ═══ 1. Remplacer model Customer ═══
const oldCustomer = `model Customer {
  id             String       @id @default(cuid())
  firstName      String
  lastName       String
  email          String?
  phone          String?
  address        String?
  city           String?
  organizationId String
  organization   Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  userId         String?
  user           User?        @relation(fields: [userId], references: [id])
  tags           String[]
  createdAt      DateTime     @default(now())
  updatedAt      DateTime     @updatedAt

  saleRecords  Sale[]
  reservations Reservation[]
  notes        CustomerNote[]
  documents    CustomerDocument[]
  posSales     PosSale[]
}`;

const newPartner = `model Partner {
  id             String       @id @default(cuid())
  type           String       @default("CUSTOMER")
  name           String
  firstName      String?
  lastName       String?
  email          String?
  phone          String?
  address        String?
  city           String?
  contactName    String?
  leadTimeDays   Int?
  notes          String?
  tags           String?
  segment        String?
  score          Int          @default(50)
  isActive       Boolean      @default(true)
  lastContactAt  DateTime?
  organizationId String
  organization   Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  userId         String?
  user           User?        @relation(fields: [userId], references: [id])
  interactions   Interaction[]

  saleRecords    Sale[]
  reservations   Reservation[]
  notes          CustomerNote[]
  documents      CustomerDocument[]
  posSales       PosSale[]
  stockItems     StockItem[]
  purchaseOrders PurchaseOrder[]

  createdAt      DateTime     @default(now())
  updatedAt      DateTime     @updatedAt

  @@index([organizationId, type])
  @@index([organizationId, segment])
  @@map("Partner")
}`;

tryR(oldCustomer, newPartner, 'Customer → Partner');

// ═══ 2. Supprimer model StockSupplier ═══
const oldSupplier = `model StockSupplier {
  id             String          @id @default(cuid())
  name           String
  purchaseOrders PurchaseOrder[]
  contactName    String?
  phone          String?
  email          String?
  address        String?
  leadTimeDays   Int?
  notes          String?
  organizationId String
  organization   Organization    @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  items          StockItem[]
  createdAt      DateTime        @default(now())
  updatedAt      DateTime        @updatedAt

  @@map("StockSupplier")
}

`;

tryR(oldSupplier, '', 'StockSupplier supprime');

// ═══ 3. Re-pointer les FK ═══
tryR(
  `  customer   Customer @relation(fields: [customerId], references: [id], onDelete: Cascade)`,
  `  customer   Partner  @relation(fields: [customerId], references: [id], onDelete: Cascade)`,
  'CustomerNote FK'
);

tryR(
  `  customer       Customer?    @relation(fields: [customerId], references: [id])`,
  `  customer       Partner?     @relation(fields: [customerId], references: [id])`,
  'Sale FK'
);

tryR(
  `  customer         Customer          @relation(fields: [customerId], references: [id])`,
  `  customer         Partner           @relation(fields: [customerId], references: [id])`,
  'Reservation FK'
);

tryR(
  `  customer       Customer?     @relation(fields: [customerId], references: [id])`,
  `  customer       Partner?      @relation(fields: [customerId], references: [id])`,
  'PosSale FK'
);

tryR(
  `  supplier           StockSupplier?      @relation(fields: [supplierId], references: [id])`,
  `  supplier           Partner?             @relation(fields: [supplierId], references: [id])`,
  'StockItem.supplier FK'
);

tryR(
  `  supplier       StockSupplier       @relation(fields: [supplierId], references: [id])`,
  `  supplier       Partner             @relation(fields: [supplierId], references: [id])`,
  'PurchaseOrder.supplier FK'
);

// ═══ 4. Back-relations Organization ═══
tryR(
  `  customers       Customer[]`,
  `  partners        Partner[]`,
  'Organization.customers → partners'
);

// ═══ 5. Back-relation User ═══
tryR(
  `  customer       Customer?`,
  `  partner        Partner?`,
  'User.customer → partner'
);

fs.writeFileSync(p, s);
console.log(`\n✅ ${n} patch(es) applique(s)`);
