const fs = require("fs");
const p = "src/stock/stock.module.ts";
let s = fs.readFileSync(p, "utf8");

if (s.includes("PurchaseOrdersService")) { console.log("SKIP"); process.exit(0); }

s = s.replace(
  `import { StockController } from './stock.controller';`,
  `import { StockController } from './stock.controller';
import { PurchaseOrdersService } from './purchase-orders.service';
import { PurchaseOrdersController } from './purchase-orders.controller';`
);
s = s.replace(
  `  controllers: [StockController],`,
  `  controllers: [StockController, PurchaseOrdersController],`
);
s = s.replace(
  `  providers: [StockService, PrismaService],`,
  `  providers: [StockService, PurchaseOrdersService, PrismaService],`
);
s = s.replace(
  `  exports: [StockService],`,
  `  exports: [StockService, PurchaseOrdersService],`
);

fs.writeFileSync(p, s);
console.log("✅ stock.module.ts mis a jour");
