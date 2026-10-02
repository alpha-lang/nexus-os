const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function main() {
  const nexus = await p.organization.findFirst({ where: { type: 'INTERNE' } });
  if (!nexus) { console.error('❌ NEXUS CORP introuvable'); return; }

  let module = await p.module.findFirst({
    where: { route: '/dashboard/webhooks', organizationId: nexus.id },
  });

  if (!module) {
    module = await p.module.create({
      data: {
        name: 'Webhooks',
        route: '/dashboard/webhooks',
        price: 0,
        types: 'COMMERCE,HOTEL,RESTAURANT,ECOLE,CLINIQUE,ONG,MICROFINANCE,BANQUE',
        status: 'ACTIVE',
        organizationId: nexus.id,
      },
    });
    console.log('✅ Module Webhooks créé');
  }

  const subs = await p.subscription.findMany({
    where: { status: { in: ['ACTIVE', 'TRIAL'] } },
    include: { organization: { select: { name: true } } },
  });

  let attached = 0;
  for (const sub of subs) {
    const exists = await p.subscriptionModule.findFirst({
      where: { subscriptionId: sub.id, moduleId: module.id },
    });
    if (!exists) {
      await p.subscriptionModule.create({
        data: { subscriptionId: sub.id, moduleId: module.id, isActive: true },
      });
      attached++;
      console.log('  → Attaché à', sub.organization?.name);
    }
  }
  console.log(`✅ ${attached} subscription(s) mise(s) à jour`);
}

main().catch(console.error).finally(() => p.$disconnect());
