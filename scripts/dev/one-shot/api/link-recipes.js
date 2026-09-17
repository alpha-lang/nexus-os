const {PrismaClient} = require('@prisma/client');
const p = new PrismaClient();
(async()=>{
  const org = await p.organization.findFirst({ where: { name: { contains: 'Nirina', mode: 'insensitive' } } });
  const recipes = await p.recipe.findMany({ where: { organizationId: org.id } });
  const menu = await p.menuItem.findMany({ where: { organizationId: org.id } });

  console.log('=== Recettes a relier ===');
  for (const r of recipes) {
    if (r.menuItemId) { console.log(`  ${r.name} - deja lie`); continue; }
    const target = menu.find(m => m.name?.toLowerCase().includes(r.name.split(' ')[0].toLowerCase()));
    if (target) {
      await p.recipe.update({
        where: { id: r.id },
        data: { menuItemId: target.id, sellingPrice: target.price, notes: `Plat: ${target.name}` },
      });
      console.log(`  ✅ ${r.name} -> ${target.name} (${target.price} Ar)`);
    } else {
      console.log(`  ⚠️  ${r.name} - pas de MenuItem correspondant`);
    }
  }

  console.log('\n=== Verif ===');
  const updated = await p.recipe.findMany({
    where: { organizationId: org.id },
    include: { menuItem: { select: { name: true, price: true } }, ingredients: true },
  });
  updated.forEach(r => {
    console.log(`  ${r.name} -> ${r.menuItem?.name || 'NON LIE'} (${r.ingredients.length} ingredients)`);
  });

  await p.$disconnect();
})();
