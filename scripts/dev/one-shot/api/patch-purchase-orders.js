const fs = require("fs");
const p = "prisma/schema.prisma";
let s = fs.readFileSync(p, "utf8");

if (s.includes("model PurchaseOrder ")) {
  console.log("SKIP - deja present");
  process.exit(0);
}

const models = `

// ═══════════════════════════════════════════════════════
//  COMMANDES FOURNISSEUR
// ═══════════════════════════════════════════════════════

model PurchaseOrder {
  id             String              @id @default(cuid())
  reference      String
  supplierId     String
  supplier       StockSupplier       @relation(fields: [supplierId], references: [id])
  status         String              @default("DRAFT")
  totalAmount    Float               @default(0)
  expectedDate   DateTime?
  receivedAt     DateTime?
  notes          String?
  createdById    String?
  createdBy      User?               @relation("PurchaseOrderCreatedBy", fields: [createdById], references: [id])
  organizationId String
  organization   Organization        @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  items          PurchaseOrderItem[]
  createdAt      DateTime            @default(now())
  updatedAt      DateTime            @updatedAt

  @@unique([organizationId, reference])
  @@index([organizationId, status])
  @@map("PurchaseOrder")
}

model PurchaseOrderItem {
  id            String        @id @default(cuid())
  orderId       String
  order         PurchaseOrder @relation(fields: [orderId], references: [id], onDelete: Cascade)
  stockItemId   String
  stockItem     StockItem     @relation(fields: [stockItemId], references: [id])
  quantity      Float
  unitCost      Float         @default(0)
  total         Float         @default(0)
  receivedQty   Float         @default(0)

  @@map("PurchaseOrderItem")
}
`;

s = s.trimEnd() + "\n" + models;
fs.writeFileSync(p, s);

// Ajouter back-relations
function tryR(old, neu, label) {
  if (!s.includes(old)) { console.warn(`  MISS ${label}`); return; }
  s = s.replace(old, neu); console.log(`  OK ${label}`);
}

// Sur Organization
tryR(
  `  stockWarehouses StockWarehouse[]`,
  `  stockWarehouses StockWarehouse[]
  purchaseOrders  PurchaseOrder[]`,
  "Organization.purchaseOrders"
);

// Sur StockSupplier
tryR(
  `model StockSupplier {
  id             String       @id @default(cuid())
  name           String`,
  `model StockSupplier {
  id             String       @id @default(cuid())
  name           String
  purchaseOrders PurchaseOrder[]`,
  "StockSupplier.purchaseOrders"
);

// Sur StockItem
tryR(
  `  recipeLines    RecipeIngredient[]`,
  `  recipeLines    RecipeIngredient[]
  purchaseOrderItems PurchaseOrderItem[]`,
  "StockItem.purchaseOrderItems"
);

// Sur User
tryR(
  `  stockMovements StockMovement[]`,
  `  stockMovements StockMovement[]
  purchaseOrdersCreated PurchaseOrder[] @relation("PurchaseOrderCreatedBy")`,
  "User.purchaseOrdersCreated"
);

fs.writeFileSync(p, s);
console.log("\n✅ Modeles PurchaseOrder ajoutes");
