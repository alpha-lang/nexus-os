const fs = require("fs");
const p = "src/cash/cash.service.ts";
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

console.log("Patches cash.service.ts...");

// ─── 1. createMovement : récupérer session ouverte + lier au mouvement ───
tryReplace(
  `    if (register.status !== 'OPEN') {
      throw new BadRequestException(
        'Caisse fermee : impossible d enregistrer un mouvement. Ouvrez la caisse d abord.',
      );
    }

    const amount = parseFloat(data.amount) || 0;`,
  `    if (register.status !== 'OPEN') {
      throw new BadRequestException(
        'Caisse fermee : impossible d enregistrer un mouvement. Ouvrez la caisse d abord.',
      );
    }

    // Recupere la session OUVERTE (closedAt === null)
    const session = await this.prisma.cashSession.findFirst({
      where: { registerId: data.registerId, closedAt: null },
      orderBy: { openedAt: 'desc' },
    });
    if (!session) {
      throw new BadRequestException(
        'Aucune session ouverte sur cette caisse. Ouvrez une session avant de saisir un mouvement.',
      );
    }

    const amount = parseFloat(data.amount) || 0;`,
  "createMovement session lookup"
);

// ─── 2. createMovement : ajouter sessionId dans le create ───
tryReplace(
  `      const movement = await tx.cashMovement.create({
        data: {
          registerId: data.registerId,
          type,
          amount,`,
  `      const movement = await tx.cashMovement.create({
        data: {
          registerId: data.registerId,
          sessionId: session.id,
          type,
          amount,`,
  "createMovement sessionId link"
);

// ─── 3. openRegister : openingBreakdown + reset closedAt ───
tryReplace(
  `      const session = await tx.cashSession.create({
        data: {
          registerId,
          openingAmount,
          userId: user.userId || user.id,
          organizationId: orgId,
          notes: data.notes || null,
        },
      });

      await tx.cashRegister.update({
        where: { id: registerId },
        data: {
          status: 'OPEN',
          openedAt: new Date(),
          currentBalance: openingAmount,
        },
      });`,
  `      const session = await tx.cashSession.create({
        data: {
          registerId,
          openingAmount,
          openingBreakdown: data.openingBreakdown || null,
          userId: user.userId || user.id,
          organizationId: orgId,
          notes: data.notes || null,
        },
      });

      await tx.cashRegister.update({
        where: { id: registerId },
        data: {
          status: 'OPEN',
          openedAt: new Date(),
          closedAt: null,
          currentBalance: openingAmount,
        },
      });`,
  "openRegister breakdown + reset closedAt"
);

// ─── 4. closeRegister : closingBreakdown + closedAt register ───
tryReplace(
  `      if (openSession) {
        await tx.cashSession.update({
          where: { id: openSession.id },
          data: {
            closedAt: new Date(),
            closingAmount,
            theoreticalAmount,
            difference,
            notes: data.notes || openSession.notes,
          },
        });
      }

      await tx.cashRegister.update({
        where: { id: registerId },
        data: { status: 'CLOSED', currentBalance: closingAmount },
      });`,
  `      if (openSession) {
        await tx.cashSession.update({
          where: { id: openSession.id },
          data: {
            closedAt: new Date(),
            closingAmount,
            theoreticalAmount,
            difference,
            closingBreakdown: data.closingBreakdown || null,
            notes: data.notes || openSession.notes,
          },
        });
      }

      await tx.cashRegister.update({
        where: { id: registerId },
        data: {
          status: 'CLOSED',
          closedAt: new Date(),
          currentBalance: closingAmount,
        },
      });`,
  "closeRegister breakdown + closedAt register"
);

// ─── 5. closeRegister : refuser s'il n'y a PAS de session ouverte ───
tryReplace(
  `    if (register.status !== 'OPEN') throw new BadRequestException('Cette caisse est deja fermee');

    const closingAmount = parseFloat(data.closingAmount) || 0;`,
  `    if (register.status !== 'OPEN') throw new BadRequestException('Cette caisse est deja fermee');

    // Verifie qu'une session ouverte existe
    const openSessionCheck = await this.prisma.cashSession.findFirst({
      where: { registerId, closedAt: null },
    });
    if (!openSessionCheck) {
      throw new BadRequestException(
        'Aucune session ouverte : impossible de fermer. Ouvrez une session avant.',
      );
    }

    const closingAmount = parseFloat(data.closingAmount) || 0;`,
  "closeRegister session check"
);

// ─── 6. findAllSessions : inclure movements count + breakdown ───
tryReplace(
  `    return this.prisma.cashSession.findMany({
      where,
      include: {
        register: { select: { id: true, name: true } },
        user: { select: { id: true, name: true, email: true } },
      },
      orderBy: { openedAt: 'desc' },
      take: 100,
    });`,
  `    return this.prisma.cashSession.findMany({
      where,
      include: {
        register: { select: { id: true, name: true } },
        user: { select: { id: true, name: true, email: true } },
        _count: { select: { movements: true, orderPayments: true } },
      },
      orderBy: { openedAt: 'desc' },
      take: 100,
    });`,
  "findAllSessions include counts"
);

fs.writeFileSync(p, s);
console.log(`\nTotal : ${n}/6 patch(es) applique(s)`);
