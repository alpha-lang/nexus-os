const {PrismaClient} = require('@prisma/client');
const p = new PrismaClient();
(async()=>{
  const org = await p.organization.findFirst({ where: { name: { contains: 'Nirina', mode: 'insensitive' } } });
  const id = org.id;
  const [wh, sup, items, mvt, rec, recIng] = await Promise.all([
    p.stockWarehouse.count({ where: { organizationId: id } }),
    p.stockSupplier.count({ where: { organizationId: id } }),
    p.stockItem.count({ where: { organizationId: id } }),
    p.stockMovement.count({ where: { organizationId: id } }),
    p.recipe.count({ where: { organizationId: id } }),
    p.recipeIngredient.count({ where: { recipe: { organizationId: id } } }),
  ]);
  console.log('=== Stock Nirina ===');
  console.log('  Magasins    :', wh);
  console.log('  Fournisseurs:', sup);
  console.log('  Articles    :', items);
  console.log('  Mouvements  :', mvt);
  console.log('  Recettes    :', rec);
  console.log('  Ingredients :', recIng);

  // Apercu : articles critiques (stock < min)
  const critical = await p.stockItem.findMany({
    where: { organizationId: id, currentStock: { lt: 5 } },
    select: { name: true, currentStock: true, minStock: true, unit: true },
    take: 10,
  });
  console.log('\n=== Articles critiques ===');
  critical.forEach(i => console.log(`  ${i.name} : ${i.currentStock} ${i.unit} (min ${i.minStock})`));

  // Valeur totale
  const all = await p.stockItem.findMany({ where: { organizationId: id } });
  const totalValue = all.reduce((s, i) => s + i.currentStock * i.costPrice, 0);
  console.log('\n=== Valorisation ===');
  console.log('  Total stock :', totalValue.toLocaleString('fr-FR'), 'Ar');

  await p.$disconnect();
})();
