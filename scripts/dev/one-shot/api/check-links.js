const {PrismaClient} = require('@prisma/client');
const p = new PrismaClient();
(async()=>{
  const sessions = await p.cashSession.findMany({
    include: { _count: { select: { movements: true, orderPayments: true } } },
    orderBy: { openedAt: 'desc' },
    take: 3,
  });
  console.log('=== Sessions avec counts ===');
  sessions.forEach(s => {
    console.log(`  ${s.id.slice(0,12)} | open=${!s.closedAt} | mvts=${s._count.movements} | payments=${s._count.orderPayments}`);
  });

  const mvts = await p.cashMovement.findMany({
    orderBy: { createdAt: 'desc' },
    take: 5,
  });
  console.log('\n=== CashMovement recents ===');
  mvts.forEach(m => {
    console.log(`  ${m.type.padEnd(5)} ${String(m.amount).padStart(7)} Ar | session=${m.sessionId ? m.sessionId.slice(0,10) : 'NULL'}`);
  });

  const pays = await p.orderPayment.findMany({
    orderBy: { createdAt: 'desc' },
    take: 5,
  });
  console.log('\n=== OrderPayment recents ===');
  pays.forEach(pay => {
    console.log(`  ${pay.method.padEnd(5)} ${String(pay.amount).padStart(7)} Ar | session=${pay.cashSessionId ? pay.cashSessionId.slice(0,10) : 'NULL'}`);
  });

  await p.$disconnect();
})();
