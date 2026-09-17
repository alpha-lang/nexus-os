const {PrismaClient} = require('@prisma/client');
const p = new PrismaClient();
(async()=>{
  try {
    const count = await p.partner.count();
    console.log('✅ Table Partner existe — count:', count);
  } catch (e) {
    console.error('❌ Table Partner absente:', e.message.slice(0, 150));
  }
  await p.$disconnect();
})();
