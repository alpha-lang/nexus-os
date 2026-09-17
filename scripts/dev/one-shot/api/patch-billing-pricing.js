const fs = require("fs");
const p = "src/billing/billing.service.ts";
let s = fs.readFileSync(p, "utf8");
let n = 0;
function tryR(old, neu, label) {
  if (!s.includes(old)) { console.warn(`  MISS ${label}`); return false; }
  s = s.replace(old, neu); console.log(`  OK ${label}`); n++; return true;
}

console.log("Patch billing.service...");

// 1. Import helper
tryR(
  `import { PrismaService } from '../prisma.service';`,
  `import { PrismaService } from '../prisma.service';
import { resolvePrice } from '../modules/pricing.util';`,
  "import helper"
);

// 2. Inclure organization.type dans la requete subscription + utiliser resolvePrice
tryR(
  `    const subscription = await this.prisma.subscription.findUnique({
      where: { id: subscriptionId },
      include: { activeModules: { include: { module: true } } },
    });

    if (!subscription) throw new NotFoundException('Abonnement introuvable');

    let totalAmount = 0;
    for (const am of subscription.activeModules) {
      if (am.isActive) {
        totalAmount += am.module?.price || 0;
      }
    }`,
  `    const subscription = await this.prisma.subscription.findUnique({
      where: { id: subscriptionId },
      include: {
        activeModules: { include: { module: true } },
        organization: { select: { type: true } },
      },
    });

    if (!subscription) throw new NotFoundException('Abonnement introuvable');

    let totalAmount = 0;
    for (const am of subscription.activeModules) {
      if (am.isActive) {
        totalAmount += resolvePrice(am.module, subscription.organization?.type);
      }
    }`,
  "billing avec resolvePrice"
);

fs.writeFileSync(p, s);
console.log(`\nTotal : ${n}/2 patch(es)`);
