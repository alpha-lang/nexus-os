const fs = require("fs");
const p = "src/pos/pos.service.ts";
let s = fs.readFileSync(p, "utf8");
let n = 0;
function tryR(old, neu, label) {
  if (!s.includes(old)) { console.warn(`  MISS ${label}`); return false; }
  s = s.replace(old, neu); console.log(`  OK ${label}`); n++; return true;
}

console.log("Patch pos.service auto-destock...");

// 1. Helper : déduire le stock d'un article (au niveau du type, pas d'un user)
if (!s.includes("private async consumeStockForMenuItems")) {
  tryR(
    `  private async getOrganizationId(user: any): Promise<string> {`,
    `  /**
   * Déstocke automatiquement les ingrédients des recettes liées à un MenuItem.
   * Utilise le magasin CUISINE en priorité.
   */
  private async consumeStockForMenuItems(
    orgId: string,
    userId: string | null,
    orderId: string,
    items: { menuItemId: string; quantity: number }[],
  ) {
    if (!items.length) return;

    // Magasin prioritaire : CUISINE sinon premier dispo
    const warehouse =
      (await this.prisma.stockWarehouse.findFirst({ where: { organizationId: orgId, code: 'CUISINE' } })) ||
      (await this.prisma.stockWarehouse.findFirst({ where: { organizationId: orgId, isDefault: true } })) ||
      (await this.prisma.stockWarehouse.findFirst({ where: { organizationId: orgId } }));
    if (!warehouse) return;

    for (const it of items) {
      // 1. Recette liée au MenuItem
      const recipe = await this.prisma.recipe.findFirst({
        where: { organizationId: orgId, menuItemId: it.menuItemId },
        include: { ingredients: true },
      });

      if (recipe && recipe.ingredients.length > 0) {
        // a. Decompter chaque ingredient
        for (const ing of recipe.ingredients) {
          const qty = ing.quantity * it.quantity * (recipe.yield > 0 ? 1 / recipe.yield : 1);
          await this.adjustStock(orgId, warehouse.id, ing.stockItemId, -qty, 'CONSUMPTION', orderId, userId);
        }
      } else {
        // 2. Fallback : si le MenuItem est un StockItem revendable direct
        const stockItem = await this.prisma.stockItem.findFirst({
          where: { organizationId: orgId, catalogItemId: null, name: { equals: (await this.prisma.menuItem.findUnique({ where: { id: it.menuItemId } }))?.name || '' } },
        });
        if (stockItem && stockItem.isSellable) {
          await this.adjustStock(orgId, warehouse.id, stockItem.id, -it.quantity, 'CONSUMPTION', orderId, userId);
        }
      }
    }
  }

  private async adjustStock(
    orgId: string,
    warehouseId: string,
    itemId: string,
    delta: number,
    type: string,
    reference: string,
    userId: string | null,
  ) {
    try {
      await this.prisma.$transaction(async (tx) => {
        await tx.stockMovement.create({
          data: {
            itemId,
            warehouseId,
            type,
            quantity: delta,
            reason: 'Auto-destockage POS',
            reference,
            userId,
            organizationId: orgId,
          },
        });
        await tx.stockItem.update({
          where: { id: itemId },
          data: { currentStock: { increment: delta } },
        });
        await tx.stockItemStock.upsert({
          where: { itemId_warehouseId: { itemId, warehouseId } },
          update: { quantity: { increment: delta } },
          create: { itemId, warehouseId, quantity: delta },
        });
      });
    } catch (e) {
      console.error('[adjustStock] Erreur:', e);
    }
  }

  private async getOrganizationId(user: any): Promise<string> {`,
    "helpers consumeStock + adjustStock"
  );
}

// 2. Hook dans sendToKitchen (l'action "envoyer en cuisine" = debut consommation)
tryR(
  `  async sendToKitchen(user: any, orderId: string) {
    if (!this.canWrite(user)) throw new ForbiddenException('Acces refuse');
    return this.prisma.restaurantOrder.update({ where: { id: orderId }, data: { status: 'PREPARING' } });
  }`,
  `  async sendToKitchen(user: any, orderId: string) {
    if (!this.canWrite(user)) throw new ForbiddenException('Acces refuse');
    const orgId = await this.getOrganizationId(user);

    const order = await this.prisma.restaurantOrder.findFirst({
      where: { id: orderId, organizationId: orgId },
      include: { items: true },
    });
    if (!order) throw new NotFoundException('Commande introuvable');

    // Update statut
    const updated = await this.prisma.restaurantOrder.update({
      where: { id: orderId },
      data: { status: 'PREPARING' },
    });

    // Auto-destockage : ingredients consommes
    if (order.status === 'PENDING') {
      await this.consumeStockForMenuItems(
        orgId,
        user.userId || user.id,
        orderId,
        order.items.map((it) => ({ menuItemId: it.menuItemId, quantity: it.quantity })),
      );
    }

    return updated;
  }`,
  "hook sendToKitchen"
);

fs.writeFileSync(p, s);
console.log(`\nTotal : ${n}/2 patch(es)`);
