const fs = require("fs");
const p = "src/app.module.ts";
let s = fs.readFileSync(p, "utf8");
let n = 0;

// Import
if (!s.includes("StockModule")) {
  s = s.replace(
    `import { CashModule } from './cash/cash.module';`,
    `import { CashModule } from './cash/cash.module';
import { StockModule } from './stock/stock.module';`
  );
  console.log("  OK import StockModule");
  n++;
}

// Ajouter dans imports[]
if (!s.includes("StockModule,")) {
  s = s.replace(
    `    CashModule,
  ],`,
    `    CashModule,
    StockModule,
  ],`
  );
  console.log("  OK StockModule dans imports[]");
  n++;
}

fs.writeFileSync(p, s);
console.log(`\nTotal : ${n}/2 patch(es)`);
