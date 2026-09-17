const fs = require("fs");
const p = "src/pos/pos.service.ts";
let s = fs.readFileSync(p, "utf8");

const old = `  async sendToKitchen(user: any, orderId: string) {
    if (!this.canWrite(user)) throw new ForbiddenException('Accès refusé');
    return this.prisma.restaurantOrder.update({ where: { id: orderId }, data: { status: 'PREPARING' } });
  }`;

const neu = `  async sendToKitchen(user: any, orderId: string) {
    if (!this.canWrite(user)) throw new ForbiddenException('Accès refusé');
    const orgId = await this.getOrganizationId(user);

    const order = await this.prisma.restaurantOrder.findFirst({
      where: { id: orderId, organizationId: orgId },
      include: { items: true },
    });
    if (!order) throw new NotFoundException('Commande introuvable');

    const updated = await this.prisma.restaurantOrder.update({
      where: { id: orderId },
      data: { status: 'PREPARING' },
    });

    // Auto-destockage : ingredients consommes (une seule fois par commande)
    if (order.status === 'PENDING') {
      await this.consumeStockForMenuItems(
        orgId,
        user.userId || user.id,
        orderId,
        order.items.map((it) => ({ menuItemId: it.menuItemId, quantity: it.quantity })),
      );
    }

    return updated;
  }`;

if (!s.includes(old)) {
  console.error("❌ anchor introuvable");
  // Afficher ce qui existe autour
  const idx = s.indexOf("sendToKitchen");
  if (idx > 0) console.error("Contexte:\n" + s.slice(idx - 100, idx + 400));
  process.exit(1);
}

s = s.replace(old, neu);
fs.writeFileSync(p, s);
console.log("✅ sendToKitchen branche sur consumeStockForMenuItems");
