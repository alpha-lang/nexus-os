const {PrismaClient} = require('@prisma/client');
const p = new PrismaClient();
(async()=>{
  const sessions = await p.cashSession.findMany({
    orderBy: { openedAt: 'desc' },
    take: 3,
  });
  console.log('=== CashSession ===');
  sessions.forEach(s => {
    console.log('');
    console.log('  ID      :', s.id.slice(0, 12));
    console.log('  open    :', !s.closedAt);
    console.log('  opening :', s.openingAmount, 'Ar | breakdown:', JSON.stringify(s.openingBreakdown));
    console.log('  closing :', s.closingAmount, 'Ar | breakdown:', JSON.stringify(s.closingBreakdown));
    console.log('  diff    :', s.difference, 'Ar');
  });

  const reg = await p.cashRegister.findFirst();
  console.log('\n=== CashRegister ===');
  console.log('  status  :', reg.status);
  console.log('  openedAt:', reg.openedAt?.toISOString() || 'null');
  console.log('  closedAt:', reg.closedAt?.toISOString() || 'null');

  await p.$disconnect();
})();
