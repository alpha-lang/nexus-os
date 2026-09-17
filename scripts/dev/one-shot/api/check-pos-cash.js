const {PrismaClient} = require('@prisma/client');
const p = new PrismaClient();
(async()=>{
  // Derniers OrderPayment
  const pays = await p.orderPayment.findMany({
    orderBy: { createdAt: 'desc' },
    take: 5,
    include: { order: { select: { id: true, total: true } } },
  });
  console.log('=== OrderPayment recents ===');
  pays.forEach(pay => {
    console.log(`  ${pay.method} ${pay.amount} Ar | sessionId=${pay.cashSessionId ? pay.cashSessionId.slice(0,10) : 'NULL'}`);
  });

  // Derniers CashMovement (SALE)
  const mvts = await p.cashMovement.findMany({
    where: { type: 'SALE' },
    orderBy: { createdAt: 'desc' },
    take: 5,
  });
  console.log('\n=== CashMovement SALE recents ===');
  mvts.forEach(m => {
    console.log(`  ${m.amount} Ar | sessionId=${m.sessionId ? m.sessionId.slice(0,10) : 'NULL'}`);
  });

  await p.$disconnect();
})();
