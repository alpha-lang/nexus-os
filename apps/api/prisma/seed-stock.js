const {PrismaClient} = require('@prisma/client');
const p = new PrismaClient();

async function main() {
  const org = await p.organization.findFirst({ where: { name: { contains: 'Nirina', mode: 'insensitive' } } });
  if (!org) { console.error('❌ Nirina introuvable'); return; }
  const orgId = org.id;
  console.log('Org:', org.name);

  const admin = await p.user.findFirst({ where: { organizationId: orgId, role: 'ADMIN' } });

  // ─── 1. Magasins ───
  const warehouses = await Promise.all([
    p.stockWarehouse.upsert({
      where: { organizationId_code: { organizationId: orgId, code: 'ECONOMAT' } },
      update: {},
      create: { name: 'Economat principal', code: 'ECONOMAT', location: 'Sous-sol', isDefault: true, organizationId: orgId },
    }),
    p.stockWarehouse.upsert({
      where: { organizationId_code: { organizationId: orgId, code: 'CUISINE' } },
      update: {},
      create: { name: 'Cuisine', code: 'CUISINE', location: 'RDC', organizationId: orgId },
    }),
    p.stockWarehouse.upsert({
      where: { organizationId_code: { organizationId: orgId, code: 'BAR' } },
      update: {},
      create: { name: 'Bar', code: 'BAR', location: 'Terrasse', organizationId: orgId },
    }),
  ]);
  console.log('Magasins:', warehouses.length);

  // ─── 2. Fournisseurs ───
  const suppliers = await Promise.all([
    p.stockSupplier.create({ data: { name: 'Metro Tana', contactName: 'Jean Paul', phone: '+261 34 11 111 11', email: 'contact@metro.mg', leadTimeDays: 2, organizationId: orgId } }).catch(() => null),
    p.stockSupplier.create({ data: { name: 'Leader Price', contactName: 'Marie', phone: '+261 34 22 222 22', leadTimeDays: 3, organizationId: orgId } }).catch(() => null),
    p.stockSupplier.create({ data: { name: 'Boucherie Centrale', contactName: 'Hery', phone: '+261 34 33 333 33', leadTimeDays: 1, organizationId: orgId } }).catch(() => null),
  ]).then(arr => arr.filter(Boolean));
  console.log('Fournisseurs:', suppliers.length);

  // ─── 3. Articles ───
  const itemsData = [
    // Ingrédients
    { name: 'Farine T55', sku: 'FAR-T55', category: 'ALIMENTAIRE', unit: 'kg', currentStock: 25, minStock: 10, costPrice: 3500, isIngredient: true, supplier: 0 },
    { name: 'Riz blanc', sku: 'RIZ-BLC', category: 'ALIMENTAIRE', unit: 'kg', currentStock: 40, minStock: 15, costPrice: 2800, isIngredient: true, supplier: 0 },
    { name: 'Poulet entier', sku: 'POU-ENT', category: 'ALIMENTAIRE', unit: 'kg', currentStock: 12, minStock: 8, costPrice: 12000, isIngredient: true, supplier: 2 },
    { name: 'Zebu filet', sku: 'ZEB-FIL', category: 'ALIMENTAIRE', unit: 'kg', currentStock: 6, minStock: 5, costPrice: 35000, isIngredient: true, supplier: 2 },
    { name: 'Salade verte', sku: 'SAL-VER', category: 'ALIMENTAIRE', unit: 'kg', currentStock: 3, minStock: 4, costPrice: 4000, isIngredient: true, supplier: 1 },
    { name: 'Tomate', sku: 'TOM-001', category: 'ALIMENTAIRE', unit: 'kg', currentStock: 8, minStock: 5, costPrice: 3000, isIngredient: true, supplier: 1 },
    { name: 'Fromage parmesan', sku: 'FRM-PAR', category: 'ALIMENTAIRE', unit: 'kg', currentStock: 1.5, minStock: 1, costPrice: 45000, isIngredient: true, supplier: 0 },
    { name: 'Huile vegetale', sku: 'HUI-VEG', category: 'ALIMENTAIRE', unit: 'L', currentStock: 15, minStock: 8, costPrice: 6500, isIngredient: true, supplier: 0 },
    { name: 'Sucre blanc', sku: 'SUC-BLC', category: 'ALIMENTAIRE', unit: 'kg', currentStock: 20, minStock: 10, costPrice: 3200, isIngredient: true, supplier: 0 },
    { name: 'Glace vanille', sku: 'GLA-VAN', category: 'ALIMENTAIRE', unit: 'L', currentStock: 4, minStock: 3, costPrice: 18000, isIngredient: true, supplier: 0 },
    
    // Boissons (revendables)
    { name: 'Coca-Cola 33cl', sku: 'COC-33', category: 'BOISSON', unit: 'piece', currentStock: 48, minStock: 24, costPrice: 1500, salePrice: 5000, isSellable: true, supplier: 0 },
    { name: 'THB 33cl', sku: 'THB-33', category: 'BOISSON', unit: 'piece', currentStock: 36, minStock: 24, costPrice: 2000, salePrice: 6000, isSellable: true, supplier: 0 },
    { name: 'Eau minerale 50cl', sku: 'EAU-50', category: 'BOISSON', unit: 'piece', currentStock: 72, minStock: 36, costPrice: 800, salePrice: 3000, isSellable: true, supplier: 0 },
    { name: 'Fanta Orange 33cl', sku: 'FAN-33', category: 'BOISSON', unit: 'piece', currentStock: 24, minStock: 24, costPrice: 1500, salePrice: 5000, isSellable: true, supplier: 0 },
    { name: 'Cafe moulu', sku: 'CAF-MOU', category: 'BOISSON', unit: 'kg', currentStock: 2, minStock: 1, costPrice: 45000, isIngredient: true, supplier: 0 },
    { name: 'The noir', sku: 'THE-NOI', category: 'BOISSON', unit: 'kg', currentStock: 0.5, minStock: 1, costPrice: 30000, isIngredient: true, supplier: 0 },
    
    // Consommables
    { name: 'Savon main', sku: 'SAV-MAI', category: 'ENTRETIEN', unit: 'piece', currentStock: 30, minStock: 20, costPrice: 2500, supplier: 1 },
    { name: 'Papier toilette', sku: 'PAP-TOI', category: 'ENTRETIEN', unit: 'piece', currentStock: 100, minStock: 48, costPrice: 800, supplier: 1 },
    { name: 'Lingettes sol', sku: 'LIN-SOL', category: 'ENTRETIEN', unit: 'piece', currentStock: 15, minStock: 10, costPrice: 5000, supplier: 1 },
    { name: 'Drap lit 2 places', sku: 'DRA-LIT', category: 'LINGE', unit: 'piece', currentStock: 20, minStock: 10, costPrice: 25000, supplier: 0 },
    { name: 'Serviette bain', sku: 'SRV-BAI', category: 'LINGE', unit: 'piece', currentStock: 25, minStock: 15, costPrice: 18000, supplier: 0 },
  ];

  const createdItems = [];
  for (const it of itemsData) {
    const { supplier: supIdx, ...data } = it;
    const supplierId = suppliers[supIdx]?.id || null;
    try {
      const created = await p.stockItem.upsert({
        where: { organizationId_sku: { organizationId: orgId, sku: data.sku } },
        update: {},
        create: { ...data, supplierId, organizationId: orgId },
      });
      createdItems.push(created);

      // Créer StockItemStock pour chaque magasin (répartir le stock)
      for (const w of warehouses) {
        const qty = w.isDefault ? created.currentStock : 0;
        await p.stockItemStock.upsert({
          where: { itemId_warehouseId: { itemId: created.id, warehouseId: w.id } },
          update: {},
          create: { itemId: created.id, warehouseId: w.id, quantity: qty },
        }).catch(() => null);
      }
    } catch (e) {
      // Skip si existe déjà
    }
  }
  console.log('Articles:', createdItems.length);

  // ─── 4. Quelques mouvements de réception ───
  const economat = warehouses[0];
  for (let i = 0; i < Math.min(5, createdItems.length); i++) {
    const item = createdItems[i];
    await p.stockMovement.create({
      data: {
        itemId: item.id,
        warehouseId: economat.id,
        type: 'RECEPTION',
        quantity: item.currentStock,
        unitCost: item.costPrice,
        reason: 'Reception initiale',
        reference: 'BL-2026-001',
        userId: admin?.id || null,
        organizationId: orgId,
      },
    }).catch(() => null);
  }
  console.log('Mouvements:', Math.min(5, createdItems.length));

  // ─── 5. Recettes (pour les plats du menu) ───
  const menu = await p.menuItem.findMany({ where: { organizationId: orgId }, take: 5 });
  const farine = createdItems.find(i => i.sku === 'FAR-T55');
  const poulet = createdItems.find(i => i.sku === 'POU-ENT');
  const riz = createdItems.find(i => i.sku === 'RIZ-BLC');
  const salade = createdItems.find(i => i.sku === 'SAL-VER');
  const tomate = createdItems.find(i => i.sku === 'TOM-001');
  const fromage = createdItems.find(i => i.sku === 'FRM-PAR');
  const huile = createdItems.find(i => i.sku === 'HUI-VEG');

  const recipeData = [
    {
      name: 'Poulet roti',
      menuIdx: menu.findIndex(m => m.name?.toLowerCase().includes('poulet')),
      yield: 1,
      ingredients: [
        { item: poulet, qty: 0.5, unit: 'kg' },
        { item: huile, qty: 0.05, unit: 'L' },
      ],
    },
    {
      name: 'Riz saute',
      menuIdx: menu.findIndex(m => m.name?.toLowerCase().includes('riz')),
      yield: 1,
      ingredients: [
        { item: riz, qty: 0.2, unit: 'kg' },
        { item: huile, qty: 0.03, unit: 'L' },
        { item: tomate, qty: 0.05, unit: 'kg' },
      ],
    },
    {
      name: 'Salade Cesar',
      menuIdx: menu.findIndex(m => m.name?.toLowerCase().includes('cesar') || m.name?.toLowerCase().includes('césar')),
      yield: 1,
      ingredients: [
        { item: salade, qty: 0.15, unit: 'kg' },
        { item: poulet, qty: 0.15, unit: 'kg' },
        { item: fromage, qty: 0.03, unit: 'kg' },
      ],
    },
  ];

  for (const r of recipeData) {
    const menuItem = r.menuIdx >= 0 ? menu[r.menuIdx] : null;
    try {
      const recipe = await p.recipe.create({
        data: {
          name: r.name,
          yield: r.yield,
          sellingPrice: menuItem?.price || null,
          catalogItemId: null,
          organizationId: orgId,
          notes: menuItem ? 'Plat: ' + menuItem.name : null,
          ingredients: {
            create: r.ingredients.filter(i => i.item).map(i => ({
              stockItemId: i.item.id,
              quantity: i.qty,
              unit: i.unit,
            })),
          },
        },
      });
      console.log('  Recette:', recipe.name);
    } catch (e) {
      console.log('  Recette skip:', r.name);
    }
  }

  console.log('\n✅ Seed stock termine');
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => p.$disconnect());
