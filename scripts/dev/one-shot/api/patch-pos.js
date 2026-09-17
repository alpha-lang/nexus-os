const fs = require("fs");
const p = "src/pos/pos.service.ts";
let s = fs.readFileSync(p, "utf8");
let n = 0;

function tryReplace(old, neu, label) {
  if (s.includes(old)) {
    s = s.replace(old, neu);
    console.log(`  OK ${label}`);
    n++;
    return true;
  }
  console.warn(`  SKIP ${label}`);
  return false;
}

console.log("Patches pos.service.ts...");

// ─── 1. payOrder : lier OrderPayment a la session ouverte ───
tryReplace(
  `    await this.prisma.orderPayment.create({ data: {
      orderId, amount, method: data.method || 'CASH', notes: data.notes || null,
    }});`,
  `    // Recupere la session ouverte (s il y en a une) pour lier le paiement
    const openSession = await this.prisma.cashSession.findFirst({
      where: {
        organizationId: orgId,
        closedAt: null,
        register: { status: 'OPEN' },
      },
      orderBy: { openedAt: 'desc' },
    });

    await this.prisma.orderPayment.create({ data: {
      orderId,
      amount,
      method: data.method || 'CASH',
      notes: data.notes || null,
      cashSessionId: openSession?.id || null,
    }});`,
  "payOrder → session link"
);

// ─── 2. recordCashSale : ajouter sessionId au CashMovement ───
tryReplace(
  `      if (!register) {
        console.warn(
          \`[recordCashSale] Aucune caisse OUVERTE - vente POS \${orderId.slice(-4).toUpperCase()} \${amount} Ar NON journalisee. Ouvrez une caisse puis saisissez un mouvement manuel.\`,
        );
        return;
      }

      await this.prisma.$transaction(async (tx) => {
        await tx.cashMovement.create({
          data: {
            registerId: register.id,
            type: 'SALE',
            amount,
            reason: \`Vente POS \${orderId.slice(-4).toUpperCase()}\`,
            reference: orderId,
            userId: user.userId || user.id,
            organizationId: orgId,
          },
        });`,
  `      if (!register) {
        console.warn(
          \`[recordCashSale] Aucune caisse OUVERTE - vente POS \${orderId.slice(-4).toUpperCase()} \${amount} Ar NON journalisee. Ouvrez une caisse puis saisissez un mouvement manuel.\`,
        );
        return;
      }

      // Recupere la session ouverte du register
      const openSession = await this.prisma.cashSession.findFirst({
        where: { registerId: register.id, closedAt: null },
        orderBy: { openedAt: 'desc' },
      });

      await this.prisma.$transaction(async (tx) => {
        await tx.cashMovement.create({
          data: {
            registerId: register.id,
            sessionId: openSession?.id || null,
            type: 'SALE',
            amount,
            reason: \`Vente POS \${orderId.slice(-4).toUpperCase()}\`,
            reference: orderId,
            userId: user.userId || user.id,
            organizationId: orgId,
          },
        });`,
  "recordCashSale → session link"
);

// ─── 3. deferToRoom : OrderPayment avec sessionId ───
tryReplace(
  `    await this.prisma.orderPayment.create({ data: {
      orderId, amount: remaining, method: 'ROOM_CHARGE', notes: \`Reporté résa \${reservation.reference}\`,
    }});`,
  `    const openSessionForDefer = await this.prisma.cashSession.findFirst({
      where: {
        organizationId: orgId,
        closedAt: null,
        register: { status: 'OPEN' },
      },
      orderBy: { openedAt: 'desc' },
    });

    await this.prisma.orderPayment.create({ data: {
      orderId,
      amount: remaining,
      method: 'ROOM_CHARGE',
      notes: \`Reporte resa \${reservation.reference}\`,
      cashSessionId: openSessionForDefer?.id || null,
    }});`,
  "deferToRoom → session link"
);

fs.writeFileSync(p, s);
console.log(`\nTotal : ${n}/3 patch(es) applique(s)`);
