const fs = require("fs");
const p = "src/pos/pos.service.ts";
let s = fs.readFileSync(p, "utf8");

const old = `    // Auto-destockage : ingredients consommes (une seule fois par commande)
    if (order.status === 'PENDING') {
      await this.consumeStockForMenuItems(
        orgId,
        user.userId || user.id,
        orderId,
        order.items.map((it) => ({ menuItemId: it.menuItemId, quantity: it.quantity })),
      );
    }

    return updated;`;

const neu = `    // Auto-destockage : une seule fois par commande
    if (!order.stockConsumed) {
      await this.consumeStockForMenuItems(
        orgId,
        user.userId || user.id,
        orderId,
        order.items.map((it) => ({ menuItemId: it.menuItemId, quantity: it.quantity })),
      );
      await this.prisma.restaurantOrder.update({
        where: { id: orderId },
        data: { stockConsumed: true },
      });
    }

    return updated;`;

if (!s.includes(old)) { console.error("❌ anchor introuvable"); process.exit(1); }
s = s.replace(old, neu);
fs.writeFileSync(p, s);
console.log("✅ sendToKitchen utilise stockConsumed");
