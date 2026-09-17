const fs = require("fs");
const p = "prisma/schema.prisma";
let s = fs.readFileSync(p, "utf8");

if (s.includes("model StockItem ")) {
  console.log("SKIP - deja present");
  process.exit(0);
}

// Trouver la fin du schema pour y ajouter les modeles
const stockModels = `

// ═══════════════════════════════════════════════════════
//  MODULE STOCK — Inventaire Hotel / Restaurant
// ═══════════════════════════════════════════════════════

model StockWarehouse {
  id             String             @id @default(cuid())
  name           String
  code           String
  location       String?
  isDefault      Boolean            @default(false)
  organizationId String
  organization   Organization       @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  stocks         StockItemStock[]
  movements      StockMovement[]
  createdAt      DateTime           @default(now())
  updatedAt      DateTime           @updatedAt

  @@unique([organizationId, code])
  @@map("StockWarehouse")
}

model StockSupplier {
  id             String       @id @default(cuid())
  name           String
  contactName    String?
  phone          String?
  email          String?
  address        String?
  leadTimeDays   Int?
  notes          String?
  organizationId String
  organization   Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  items          StockItem[]
  createdAt      DateTime     @default(now())
  updatedAt      DateTime     @updatedAt

  @@map("StockSupplier")
}

model StockItem {
  id             String          @id @default(cuid())
  name           String
  sku            String?
  barcode        String?
  category       String          @default("AUTRE")
  unit           String          @default("piece")
  currentStock   Float           @default(0)
  minStock       Float           @default(0)
  maxStock       Float?
  costPrice      Float           @default(0)
  salePrice      Float?
  isSellable     Boolean         @default(false)
  isIngredient   Boolean         @default(false)
  catalogItemId  String?
  catalogItem    CatalogItem?    @relation(fields: [catalogItemId], references: [id])
  supplierId     String?
  supplier       StockSupplier?  @relation(fields: [supplierId], references: [id])
  organizationId String
  organization   Organization    @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  warehouseStock StockItemStock[]
  movements      StockMovement[]
  recipeLines    RecipeIngredient[]
  createdAt      DateTime        @default(now())
  updatedAt      DateTime        @updatedAt

  @@unique([organizationId, sku])
  @@index([organizationId, category])
  @@index([organizationId, currentStock])
  @@map("StockItem")
}

model StockItemStock {
  id          String         @id @default(cuid())
  itemId      String
  item        StockItem      @relation(fields: [itemId], references: [id], onDelete: Cascade)
  warehouseId String
  warehouse   StockWarehouse @relation(fields: [warehouseId], references: [id], onDelete: Cascade)
  quantity    Float          @default(0)
  updatedAt   DateTime       @updatedAt

  @@unique([itemId, warehouseId])
  @@map("StockItemStock")
}

model StockMovement {
  id              String          @id @default(cuid())
  itemId          String
  item            StockItem       @relation(fields: [itemId], references: [id], onDelete: Cascade)
  warehouseId     String
  warehouse       StockWarehouse  @relation(fields: [warehouseId], references: [id])
  type            String
  quantity        Float
  unitCost        Float?
  reason          String?
  reference       String?
  lotNumber       String?
  expiresAt       DateTime?
  linkedOrderId   String?
  linkedRecipeId  String?
  userId          String?
  user            User?           @relation(fields: [userId], references: [id])
  organizationId  String
  organization    Organization    @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  createdAt       DateTime        @default(now())

  @@index([organizationId, itemId, createdAt])
  @@index([organizationId, type, createdAt])
  @@index([organizationId, warehouseId, createdAt])
  @@map("StockMovement")
}

model Recipe {
  id             String             @id @default(cuid())
  name           String
  catalogItemId  String?
  catalogItem    CatalogItem?       @relation(fields: [catalogItemId], references: [id])
  yield          Int                @default(1)
  sellingPrice   Float?
  notes          String?
  organizationId String
  organization   Organization       @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  ingredients    RecipeIngredient[]
  createdAt      DateTime           @default(now())
  updatedAt      DateTime           @updatedAt

  @@index([organizationId])
  @@map("Recipe")
}

model RecipeIngredient {
  id          String     @id @default(cuid())
  recipeId    String
  recipe      Recipe     @relation(fields: [recipeId], references: [id], onDelete: Cascade)
  stockItemId String
  stockItem   StockItem  @relation(fields: [stockItemId], references: [id])
  quantity    Float
  unit        String

  @@map("RecipeIngredient")
}
`;

s = s.trimEnd() + "\n" + stockModels;
fs.writeFileSync(p, s);
console.log("✅ 7 nouveaux modeles ajoutes");
