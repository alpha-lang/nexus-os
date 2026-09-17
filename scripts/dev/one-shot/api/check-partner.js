const {PrismaClient} = require('@prisma/client');
const p = new PrismaClient();
(async()=>{
  const nirina = await p.organization.findFirst({ where: { slug: 'nirina-hotel' } });
  const [total, customers, suppliers, interactions] = await Promise.all([
    p.partner.count({ where: { organizationId: nirina.id } }),
    p.partner.count({ where: { organizationId: nirina.id, type: 'CUSTOMER' } }),
    p.partner.count({ where: { organizationId: nirina.id, type: 'SUPPLIER' } }),
    p.interaction.count({ where: { organizationId: nirina.id } }),
  ]);
  console.log('=== Partners Nirina ===');
  console.log('  Total        :', total);
  console.log('  Clients      :', customers);
  console.log('  Fournisseurs :', suppliers);
  console.log('  Interactions :', interactions);
  console.log('');
  const list = await p.partner.findMany({ where: { organizationId: nirina.id }, orderBy: { createdAt: 'desc' } });
  list.forEach(x => console.log('  [' + x.type.padEnd(8) + '] ' + x.name));
  await p.$disconnect();
})();
