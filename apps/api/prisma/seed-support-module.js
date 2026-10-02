const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function main() {
  console.log('🚀 Ajout du module Support…');

  const nexus = await p.organization.findFirst({ where: { type: 'INTERNE' } });
  if (!nexus) { console.error('❌ NEXUS CORP introuvable'); return; }

  // 1. Créer ou récupérer le module Support
  let module = await p.module.findFirst({
    where: { route: '/dashboard/support', organizationId: nexus.id },
  });

  if (!module) {
    module = await p.module.create({
      data: {
        name: 'Support',
        route: '/dashboard/support',
        price: 0,
        types: 'COMMERCE,HOTEL,RESTAURANT,ECOLE,CLINIQUE,ONG,MICROFINANCE,BANQUE',
        status: 'ACTIVE',
        organizationId: nexus.id,
      },
    });
    console.log('✅ Module Support créé :', module.id);
  } else {
    console.log('ℹ️  Module Support existe déjà :', module.id);
  }

  // 2. Attacher à toutes les subscriptions ACTIVE ou TRIAL
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

  console.log(`\n✅ ${attached} subscription(s) mise(s) à jour`);
  console.log('✨ Terminé');
}

main().catch(console.error).finally(() => p.$disconnect());
