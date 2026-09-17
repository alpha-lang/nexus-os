const fs = require("fs");
const p = "prisma/schema.prisma";
let s = fs.readFileSync(p, "utf8");
let n = 0;

function tryReplace(old, neu, label) {
  if (s.includes(old)) {
    s = s.replace(old, neu);
    console.log(`  OK ${label}`);
    n++;
    return true;
  }
  console.warn(`  SKIP ${label} (anchor introuvable)`);
  return false;
}

console.log("Application des patches...");

// 1. CashRegister.closedAt
tryReplace(
  "  openedAt       DateTime?",
  "  openedAt       DateTime?\n  closedAt       DateTime?",
  "CashRegister.closedAt"
);

// 2. CashMovement.sessionId + relation
tryReplace(
  `model CashMovement {
  id             String       @id @default(cuid())
  registerId     String
  register       CashRegister @relation(fields: [registerId], references: [id], onDelete: Cascade)
  type           String`,
  `model CashMovement {
  id             String       @id @default(cuid())
  registerId     String
  register       CashRegister @relation(fields: [registerId], references: [id], onDelete: Cascade)
  sessionId      String?
  session        CashSession? @relation(fields: [sessionId], references: [id])
  type           String`,
  "CashMovement.sessionId"
);

// 3. CashMovement index
tryReplace(
  `  createdAt      DateTime     @default(now())

  @@map("CashMovement")`,
  `  createdAt      DateTime     @default(now())

  @@index([sessionId])
  @@map("CashMovement")`,
  "CashMovement index"
);

// 4. CashSession openingBreakdown + closingBreakdown
tryReplace(
  `  notes             String?
  organizationId    String`,
  `  notes             String?
  openingBreakdown  Json?
  closingBreakdown  Json?
  organizationId    String`,
  "CashSession breakdowns"
);

// 5. CashSession back-relations
tryReplace(
  `  user              User?        @relation(fields: [userId], references: [id])
  notes             String?`,
  `  user              User?        @relation(fields: [userId], references: [id])
  movements         CashMovement[]
  orderPayments     OrderPayment[]
  notes             String?`,
  "CashSession back-relations"
);

// 6. OrderPayment.cashSessionId + relation
tryReplace(
  `model OrderPayment {
  id        String          @id @default(cuid())
  orderId   String
  order     RestaurantOrder @relation(fields: [orderId], references: [id], onDelete: Cascade)
  amount    Float
  method    String`,
  `model OrderPayment {
  id            String       @id @default(cuid())
  orderId       String
  order         RestaurantOrder @relation(fields: [orderId], references: [id], onDelete: Cascade)
  cashSessionId String?
  cashSession   CashSession? @relation(fields: [cashSessionId], references: [id])
  amount        Float
  method        String`,
  "OrderPayment.cashSessionId"
);

// 7. OrderPayment index
tryReplace(
  `  createdAt DateTime        @default(now())

  @@map("OrderPayment")`,
  `  createdAt DateTime        @default(now())

  @@index([cashSessionId])
  @@map("OrderPayment")`,
  "OrderPayment index"
);

fs.writeFileSync(p, s);
console.log(`\nTotal : ${n} patch(es) applique(s)`);
