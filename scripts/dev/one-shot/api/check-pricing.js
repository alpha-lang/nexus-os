const {PrismaClient} = require('@prisma/client');
const p = new PrismaClient();
(async()=>{
  // 1. Trouver le module Stock
  const stock = await p.module.findFirst({ where: { name: 'Stock' } });
  console.log('=== Module Stock ===');
  console.log('  price  :', stock.price, 'Ar (fallback)');
  console.log('  pricing:', JSON.stringify(stock.pricing));
  console.log('');

  // 2. Tester resolvePrice par type
  const resolvePrice = (m, orgType) => {
    if (m?.pricing && typeof m.pricing === 'object') {
      if (orgType && m.pricing[orgType] != null) return Number(m.pricing[orgType]);
      if (m.pricing.DEFAULT != null) return Number(m.pricing.DEFAULT);
    }
    return Number(m?.price) || 0;
  };

  console.log('=== Prix resolu par type ===');
  console.log('  HOTEL       :', resolvePrice(stock, 'HOTEL'), 'Ar');
  console.log('  COMMERCE    :', resolvePrice(stock, 'COMMERCE'), 'Ar');
  console.log('  ONG         :', resolvePrice(stock, 'ONG'), 'Ar (fallback)');
  console.log('  null/absent :', resolvePrice(stock, null), 'Ar (fallback)');

  await p.$disconnect();
})();
