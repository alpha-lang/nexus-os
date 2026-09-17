const {PrismaClient} = require('@prisma/client');
const p = new PrismaClient();
(async()=>{
  const [reg, mvt, ses, pay, orders] = await Promise.all([
    p.cashRegister.count(),
    p.cashMovement.count(),
    p.cashSession.count(),
    p.orderPayment.count(),
    p.restaurantOrder.count(),
  ]);
  console.log('CashRegister    :', reg);
  console.log('CashMovement    :', mvt);
  console.log('CashSession     :', ses);
  console.log('OrderPayment    :', pay);
  console.log('RestaurantOrder :', orders);
  await p.$disconnect();
})();
