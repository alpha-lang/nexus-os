const {PrismaClient} = require('@prisma/client');
const p = new PrismaClient();
(async()=>{
  const sessions = await p.cashSession.findMany({
    include: { _count: { select: { movements: true } } },
    orderBy: { openedAt: 'desc' },
    take: 3,
  });
  console.log('=== Sessions ===');
  sessions.forEach(s => {
    console.log(`  open=${!s.closedAt} | movements=${s._count.movements} | breakdown=${JSON.stringify(s.openingBreakdown)}`);
  });

  const mvts = await p.cashMovement.findMany({
    orderBy: { createdAt: 'desc' },
    take: 5,
  });
  console.log('\n=== Mouvements ===');
  mvts.forEach(m => {
    console.log(`  ${m.type} ${m.amount} Ar | sessionId=${m.sessionId ? m.sessionId.slice(0,10) : 'NULL'}`);
  });

  const reg = await p.cashRegister.findFirst();
  console.log('\n=== Register ===');
  console.log(`  status=${reg.status} | openedAt=${reg.openedAt?.toISOString()} | closedAt=${reg.closedAt?.toISOString() || 'null'}`);

  await p.$disconnect();
})();
