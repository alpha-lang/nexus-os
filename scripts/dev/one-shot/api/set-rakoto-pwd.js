const {PrismaClient} = require('@prisma/client');
const bcrypt = require('bcryptjs');
const p = new PrismaClient();
(async()=>{
  const rakoto = await p.user.findFirst({
    where: { email: 'rakoto@gmail.com' },
  });
  if (!rakoto) {
    console.log('RAKOTO introuvable. Utilisateurs existants :');
    const all = await p.user.findMany({ select: { email: true, name: true, role: true, organizationId: true } });
    all.forEach(u => console.log(`  ${u.email} (${u.role}, org=${u.organizationId?.slice(0,12)})`));
    return;
  }
  const hash = await bcrypt.hash('Rakoto123!', 10);
  await p.user.update({ where: { id: rakoto.id }, data: { password: hash } });
  console.log(`OK - mot de passe RAKOTO redefini`);
  console.log(`   email    : rakoto@gmail.com`);
  console.log(`   password : Rakoto123!`);
  console.log(`   role     : ${rakoto.role}`);
  console.log(`   org      : ${rakoto.organizationId}`);
  await p.$disconnect();
})();
