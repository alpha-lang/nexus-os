const {PrismaClient} = require('@prisma/client');
const p = new PrismaClient();

(async () => {
  const mod = await p.module.findFirst({ where: { name: 'Clients' } });
  if (!mod) {
    console.log('⚠️ Module "Clients" introuvable');
    await p.$disconnect();
    return;
  }
  console.log('Module trouve :', mod.name, '(' + mod.id + ')');
  console.log('  Route actuelle :', mod.route);

  const updated = await p.module.update({
    where: { id: mod.id },
    data: {
      name: 'CRM',
      route: '/dashboard/crm',
      description: 'Clients, fournisseurs et partenaires',
    },
  });

  console.log('');
  console.log('✅ Module renomme :');
  console.log('  name  :', updated.name);
  console.log('  route :', updated.route);
  console.log('');
  console.log('SubscriptionModule reste intact → RAKOTO garde l acces');

  await p.$disconnect();
})();
