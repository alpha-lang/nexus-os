const fs = require("fs");
const p = "src/subscriptions/subscriptions.service.ts";
let s = fs.readFileSync(p, "utf8");
let n = 0;
function tryR(old, neu, label) {
  if (!s.includes(old)) { console.warn(`  MISS ${label}`); return false; }
  s = s.replace(old, neu); console.log(`  OK ${label}`); n++; return true;
}

console.log("Patch subscriptions.service...");

// 1. Import helper
tryR(
  `import { PrismaService } from '../prisma.service';`,
  `import { PrismaService } from '../prisma.service';
import { resolvePrice } from '../modules/pricing.util';`,
  "import helper"
);

// 2. Utiliser resolvePrice avec le type d'org
tryR(
  `    let totalModules = 0;
    if (data.moduleIds && Array.isArray(data.moduleIds)) {
      for (const moduleId of data.moduleIds) {
        const module = await this.prisma.module.findUnique({ where: { id: moduleId } });
        if (module) totalModules += module.price || 0;
      }
    }
    const totalAmount = totalModules + quotaPrice;`,
  `    // Charger le type d'organisation pour appliquer le bon prix
    const org = await this.prisma.organization.findUnique({
      where: { id: data.organizationId },
      select: { type: true },
    });

    let totalModules = 0;
    if (data.moduleIds && Array.isArray(data.moduleIds)) {
      for (const moduleId of data.moduleIds) {
        const module = await this.prisma.module.findUnique({ where: { id: moduleId } });
        if (module) totalModules += resolvePrice(module, org?.type);
      }
    }
    const totalAmount = totalModules + quotaPrice;`,
  "totalModules avec resolvePrice"
);

fs.writeFileSync(p, s);
console.log(`\nTotal : ${n}/2 patch(es)`);
