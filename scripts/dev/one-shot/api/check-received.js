const {PrismaClient} = require('@prisma/client');
const p = new PrismaClient();
(async()=>{
  const org = await p.organization.findFirst({ where: { name: { contains: 'Nirina', mode: 'insensitive' } } });
  const orgId = org.id;

  const order = await p.purchaseOrder.findFirst({
    where: { organizationId: orgId },
    include: { supplier: true, items: { include: { stockItem: true } } },
    orderBy: { createdAt: 'desc' },
  });

  console.log('=== Commande ' + order.reference + ' ===');
  console.log('  Fournisseur :', order.supplier.name);
  console.log('  Statut      :', order.status);
  console.log('  Total       :', order.totalAmount.toLocaleString('fr-FR'), 'Ar');
  console.log('  Recue le    :', order.receivedAt?.toISOString());
  console.log('');
  console.log('=== Articles recus ===');
  order.items.forEach(it => {
    console.log(`  ${it.stockItem.name.padEnd(20)} qty recue=${it.receivedQty} ${it.stockItem.unit} | stock actuel=${it.stockItem.currentStock} | PMP=${it.stockItem.costPrice.toFixed(2)} Ar`);
  });

  console.log('');
  console.log('=== Derniers mouvements RECEPTION ===');
  const mvts = await p.stockMovement.findMany({
    where: { organizationId: orgId, type: 'RECEPTION' },
    include: { item: { select: { name: true, unit: true } } },
    orderBy: { createdAt: 'desc' },
    take: 5,
  });
  mvts.forEach(m => {
    console.log(`  ${m.item.name.padEnd(20)} +${m.quantity} ${m.item.unit} | ref=${m.reference || 'N/A'} | ${new Date(m.createdAt).toLocaleTimeString('fr-FR')}`);
  });

  await p.$disconnect();
})();
