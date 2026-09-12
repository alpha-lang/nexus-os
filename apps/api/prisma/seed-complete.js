const {PrismaClient} = require('@prisma/client');
const bcrypt = require('bcryptjs');
const p = new PrismaClient();

async function main() {
  console.log('🌱 Seed complet...\n');

  // ═══ 1. NEXUS CORP + Elikanto ═══
  console.log('1. NEXUS CORP + Elikanto');
  const nexusCorp = await p.organization.create({
    data: { name: 'NEXUS CORP', slug: 'nexus-corp', type: 'INTERNE', status: 'ACTIVE', city: 'Antananarivo' },
  });
  await p.storageQuota.create({ data: { organizationId: nexusCorp.id, usedStorage: 0, maxStorage: 10000 } });
  await p.user.create({
    data: {
      email: 'admin@nexus.com',
      password: await bcrypt.hash('Admin123!', 10),
      name: 'Elikanto',
      role: 'SUPER_ADMIN',
      isOwner: true,
      organizationId: nexusCorp.id,
    },
  });

  // ═══ 2. NIRINA HOTEL + RAKOTO ═══
  console.log('2. NIRINA HOTEL + RAKOTO');
  const nirina = await p.organization.create({
    data: { name: 'NIRINA HOTEL', slug: 'nirina-hotel', type: 'HOTEL', status: 'ACTIVE', city: 'Tsiroanomandidy' },
  });
  await p.storageQuota.create({ data: { organizationId: nirina.id, usedStorage: 0.026, maxStorage: 500 } });
  await p.user.create({
    data: {
      email: 'rakoto@gmail.com',
      password: await bcrypt.hash('Rakoto123!', 10),
      name: 'RAKOTO',
      role: 'ADMIN',
      organizationId: nirina.id,
    },
  });

  // ═══ 3. Modules ═══
  console.log('3. Modules');
  const modData = [
    { name: 'Caisse', route: '/dashboard/caisse', price: 30000, types: 'COMMERCE,HOTEL,ONG,MICROFINANCE,BANQUE' },
    { name: 'Clients', route: '/dashboard/clients', price: 0, types: 'COMMERCE,HOTEL,ONG,MICROFINANCE,BANQUE' },
    { name: 'Reservation', route: '/dashboard/reservations', price: 25000, types: 'HOTEL' },
    { name: 'Stock', route: '/dashboard/stock', price: 45000, pricing: { HOTEL: 23000, COMMERCE: 30000 }, types: 'HOTEL,COMMERCE' },
  ];
  const mods = [];
  for (const m of modData) {
    mods.push(await p.module.create({
      data: { name: m.name, route: m.route, price: m.price, pricing: m.pricing, types: m.types, status: 'ACTIVE', organizationId: nexusCorp.id },
    }));
  }

  // ═══ 4. Subscription ═══
  console.log('4. Subscription Nirina');
  const sub = await p.subscription.create({
    data: { organizationId: nirina.id, status: 'ACTIVE', startDate: new Date(), billingPeriod: 'MONTHLY' },
  });
  for (const mod of mods) {
    await p.subscriptionModule.create({ data: { subscriptionId: sub.id, moduleId: mod.id, isActive: true } });
  }

  // ═══ 5. Magasins + Articles ═══
  console.log('5. Magasins + Stock');
  const wh = await Promise.all([
    p.stockWarehouse.create({ data: { name: 'Economat principal', code: 'ECONOMAT', location: 'Sous-sol', isDefault: true, organizationId: nirina.id } }),
    p.stockWarehouse.create({ data: { name: 'Cuisine', code: 'CUISINE', location: 'RDC', organizationId: nirina.id } }),
    p.stockWarehouse.create({ data: { name: 'Bar', code: 'BAR', location: 'Terrasse', organizationId: nirina.id } }),
  ]);

  const itemsData = [
    { name: 'Farine T55', sku: 'FAR-T55', category: 'ALIMENTAIRE', unit: 'kg', currentStock: 25, minStock: 10, costPrice: 3500, isIngredient: true },
    { name: 'Riz blanc', sku: 'RIZ-BLC', category: 'ALIMENTAIRE', unit: 'kg', currentStock: 40, minStock: 15, costPrice: 2800, isIngredient: true },
    { name: 'Poulet entier', sku: 'POU-ENT', category: 'ALIMENTAIRE', unit: 'kg', currentStock: 12, minStock: 8, costPrice: 12000, isIngredient: true },
    { name: 'Zebu filet', sku: 'ZEB-FIL', category: 'ALIMENTAIRE', unit: 'kg', currentStock: 6, minStock: 5, costPrice: 35000, isIngredient: true },
    { name: 'Salade verte', sku: 'SAL-VER', category: 'ALIMENTAIRE', unit: 'kg', currentStock: 3, minStock: 4, costPrice: 4000, isIngredient: true },
    { name: 'Tomate', sku: 'TOM-001', category: 'ALIMENTAIRE', unit: 'kg', currentStock: 8, minStock: 5, costPrice: 3000, isIngredient: true },
    { name: 'Fromage parmesan', sku: 'FRM-PAR', category: 'ALIMENTAIRE', unit: 'kg', currentStock: 1.5, minStock: 1, costPrice: 45000, isIngredient: true },
    { name: 'Huile vegetale', sku: 'HUI-VEG', category: 'ALIMENTAIRE', unit: 'L', currentStock: 15, minStock: 8, costPrice: 6500, isIngredient: true },
    { name: 'Sucre blanc', sku: 'SUC-BLC', category: 'ALIMENTAIRE', unit: 'kg', currentStock: 20, minStock: 10, costPrice: 3200, isIngredient: true },
    { name: 'Glace vanille', sku: 'GLA-VAN', category: 'ALIMENTAIRE', unit: 'L', currentStock: 4, minStock: 3, costPrice: 18000, isIngredient: true },
    { name: 'Coca-Cola 33cl', sku: 'COC-33', category: 'BOISSON', unit: 'piece', currentStock: 48, minStock: 24, costPrice: 1500, salePrice: 5000, isSellable: true },
    { name: 'THB 33cl', sku: 'THB-33', category: 'BOISSON', unit: 'piece', currentStock: 36, minStock: 24, costPrice: 2000, salePrice: 6000, isSellable: true },
    { name: 'Eau minerale 50cl', sku: 'EAU-50', category: 'BOISSON', unit: 'piece', currentStock: 72, minStock: 36, costPrice: 800, salePrice: 3000, isSellable: true },
    { name: 'Fanta Orange 33cl', sku: 'FAN-33', category: 'BOISSON', unit: 'piece', currentStock: 24, minStock: 24, costPrice: 1500, salePrice: 5000, isSellable: true },
    { name: 'Cafe moulu', sku: 'CAF-MOU', category: 'BOISSON', unit: 'kg', currentStock: 2, minStock: 1, costPrice: 45000, isIngredient: true },
    { name: 'The noir', sku: 'THE-NOI', category: 'BOISSON', unit: 'kg', currentStock: 0.5, minStock: 1, costPrice: 30000, isIngredient: true },
    { name: 'Savon main', sku: 'SAV-MAI', category: 'ENTRETIEN', unit: 'piece', currentStock: 30, minStock: 20, costPrice: 2500 },
    { name: 'Papier toilette', sku: 'PAP-TOI', category: 'ENTRETIEN', unit: 'piece', currentStock: 100, minStock: 48, costPrice: 800 },
    { name: 'Drap lit', sku: 'DRA-LIT', category: 'LINGE', unit: 'piece', currentStock: 20, minStock: 10, costPrice: 25000 },
    { name: 'Serviette bain', sku: 'SRV-BAI', category: 'LINGE', unit: 'piece', currentStock: 25, minStock: 15, costPrice: 18000 },
  ];

  const items = [];
  for (const it of itemsData) {
    const created = await p.stockItem.create({ data: { ...it, organizationId: nirina.id } });
    items.push(created);
    for (const w of wh) {
      await p.stockItemStock.create({
        data: { itemId: created.id, warehouseId: w.id, quantity: w.isDefault ? created.currentStock : 0 },
      });
    }
  }

  // ═══ 6. Partners ═══
  console.log('6. Partners');
  const supplierPartners = await Promise.all([
    p.partner.create({ data: { type: 'SUPPLIER', name: 'Metro Tana', contactName: 'Jean Paul', phone: '+261 34 11 111 11', email: 'contact@metro.mg', leadTimeDays: 2, organizationId: nirina.id } }),
    p.partner.create({ data: { type: 'SUPPLIER', name: 'Leader Price', contactName: 'Marie', phone: '+261 34 22 222 22', leadTimeDays: 3, organizationId: nirina.id } }),
    p.partner.create({ data: { type: 'SUPPLIER', name: 'Boucherie Centrale', contactName: 'Hery', phone: '+261 34 33 333 33', leadTimeDays: 1, organizationId: nirina.id } }),
  ]);

  const clientsData = [
    { firstName: 'Jean', lastName: 'Dupont', email: 'jean.dupont@email.mg', phone: '+261 34 12 345 67', city: 'Antananarivo' },
    { firstName: 'Marie', lastName: 'Rakoto', email: 'marie.rakoto@email.mg', phone: '+261 33 45 678 90', city: 'Tsiroanomandidy' },
    { firstName: 'Pierre', lastName: 'Andrianina', phone: '+261 32 11 222 33', city: 'Antananarivo' },
    { firstName: 'Sophie', lastName: 'Martin', phone: '+261 34 55 666 77', city: 'Antsirabe' },
    { firstName: 'Hery', lastName: 'Razafy', phone: '+261 32 99 888 11', city: 'Moramanga' },
  ];
  const clients = [];
  for (const c of clientsData) {
    clients.push(await p.partner.create({
      data: {
        type: 'CUSTOMER',
        name: c.firstName + ' ' + c.lastName,
        firstName: c.firstName,
        lastName: c.lastName,
        email: c.email || null,
        phone: c.phone || null,
        city: c.city || null,
        organizationId: nirina.id,
      },
    }));
  }

  // ═══ 7. Rooms + Reservations ═══
  console.log('7. Chambres + Reservations');
  const rt1 = await p.roomType.create({ data: { name: 'Single', capacity: 1, basePrice: 50000, organizationId: nirina.id } });
  const rt2 = await p.roomType.create({ data: { name: 'Double', capacity: 2, basePrice: 90000, organizationId: nirina.id } });
  const rt3 = await p.roomType.create({ data: { name: 'Suite', capacity: 4, basePrice: 200000, organizationId: nirina.id } });

  const rooms = await Promise.all([
    p.room.create({ data: { number: '101', floor: 1, roomTypeId: rt1.id, organizationId: nirina.id } }),
    p.room.create({ data: { number: '102', floor: 1, roomTypeId: rt2.id, organizationId: nirina.id } }),
    p.room.create({ data: { number: '201', floor: 2, roomTypeId: rt2.id, organizationId: nirina.id } }),
    p.room.create({ data: { number: '202', floor: 2, roomTypeId: rt2.id, organizationId: nirina.id } }),
    p.room.create({ data: { number: '301', floor: 3, roomTypeId: rt3.id, organizationId: nirina.id } }),
  ]);

  const resas = [
    { idx: 0, roomIdx: 0, from: -1, to: 3, amount: 200000, paid: 100000, status: 'CHECKED_IN' },
    { idx: 1, roomIdx: 1, from: 0, to: 2, amount: 180000, paid: 180000, status: 'CONFIRMED' },
    { idx: 2, roomIdx: 2, from: -2, to: 1, amount: 270000, paid: 270000, status: 'CHECKED_IN' },
    { idx: 3, roomIdx: 4, from: 2, to: 5, amount: 600000, paid: 0, status: 'PENDING' },
    { idx: 4, roomIdx: 0, from: -10, to: -5, amount: 250000, paid: 250000, status: 'CHECKED_OUT' },
  ];
  let refN = 1;
  for (const r of resas) {
    const ci = new Date(); ci.setDate(ci.getDate() + r.from);
    const co = new Date(); co.setDate(co.getDate() + r.to);
    await p.reservation.create({
      data: {
        reference: 'RES-2026-' + String(refN++).padStart(4, '0'),
        checkInDate: ci, checkOutDate: co,
        adults: 1, children: 0, status: r.status,
        totalAmount: r.amount, paidAmount: r.paid,
        customerId: clients[r.idx].id, roomId: rooms[r.roomIdx].id,
        organizationId: nirina.id,
      },
    });
  }

  // ═══ 8. Menu + Tables ═══
  console.log('8. Menu + Tables');
  const menu = await Promise.all([
    p.menuItem.create({ data: { name: 'Coca-Cola', description: '33cl', category: 'RESTAURANT_BOISSON', price: 5000, organizationId: nirina.id } }),
    p.menuItem.create({ data: { name: 'THB', description: '33cl', category: 'RESTAURANT_BOISSON', price: 6000, organizationId: nirina.id } }),
    p.menuItem.create({ data: { name: 'Cafe', description: 'Expresso', category: 'RESTAURANT_BOISSON', price: 4000, organizationId: nirina.id } }),
    p.menuItem.create({ data: { name: 'Salade Cesar', description: 'Poulet, parmesan', category: 'RESTAURANT_PLAT', price: 15000, organizationId: nirina.id } }),
    p.menuItem.create({ data: { name: 'Riz saute', description: 'Legumes', category: 'RESTAURANT_PLAT', price: 18000, organizationId: nirina.id } }),
    p.menuItem.create({ data: { name: 'Poulet roti', description: 'Sauce champignons', category: 'RESTAURANT_PLAT', price: 25000, organizationId: nirina.id } }),
    p.menuItem.create({ data: { name: 'Zebu grille', description: 'Filet', category: 'RESTAURANT_PLAT', price: 35000, organizationId: nirina.id } }),
    p.menuItem.create({ data: { name: 'Glace vanille', description: '2 boules', category: 'RESTAURANT_DESSERT', price: 10000, organizationId: nirina.id } }),
    p.menuItem.create({ data: { name: 'Casquette', description: 'Logo NIRINA', category: 'BOUTIQUE', price: 15000, organizationId: nirina.id } }),
    p.menuItem.create({ data: { name: 'T-shirt souvenir', description: 'Coton', category: 'BOUTIQUE', price: 20000, organizationId: nirina.id } }),
  ]);

  const tables = await Promise.all([
    p.table.create({ data: { number: 'T1', location: 'RESTAURANT', capacity: 4, organizationId: nirina.id } }),
    p.table.create({ data: { number: 'T2', location: 'RESTAURANT', capacity: 2, organizationId: nirina.id } }),
    p.table.create({ data: { number: 'T3', location: 'RESTAURANT', capacity: 6, organizationId: nirina.id } }),
    p.table.create({ data: { number: 'T4', location: 'RESTAURANT', capacity: 4, organizationId: nirina.id } }),
    p.table.create({ data: { number: 'B1', location: 'BAR', capacity: 2, organizationId: nirina.id } }),
    p.table.create({ data: { number: 'B2', location: 'BAR', capacity: 2, organizationId: nirina.id } }),
    p.table.create({ data: { number: 'P1', location: 'POOL', capacity: 4, organizationId: nirina.id } }),
  ]);

  // ═══ 9. Recettes ═══
  console.log('9. Recettes');
  const saladeMenu = menu.find(m => m.name === 'Salade Cesar');
  const rizMenu = menu.find(m => m.name === 'Riz saute');
  const pouletMenu = menu.find(m => m.name === 'Poulet roti');

  const saladeIng = items.find(i => i.sku === 'SAL-VER');
  const pouletIng = items.find(i => i.sku === 'POU-ENT');
  const parmesanIng = items.find(i => i.sku === 'FRM-PAR');
  const rizIng = items.find(i => i.sku === 'RIZ-BLC');
  const huileIng = items.find(i => i.sku === 'HUI-VEG');
  const tomateIng = items.find(i => i.sku === 'TOM-001');

  await p.recipe.create({
    data: { name: 'Salade Cesar', yield: 1, sellingPrice: 15000, menuItemId: saladeMenu.id, organizationId: nirina.id,
      ingredients: { create: [
        { stockItemId: saladeIng.id, quantity: 0.15, unit: 'kg' },
        { stockItemId: pouletIng.id, quantity: 0.15, unit: 'kg' },
        { stockItemId: parmesanIng.id, quantity: 0.03, unit: 'kg' },
      ] },
    },
  });
  await p.recipe.create({
    data: { name: 'Riz saute', yield: 1, sellingPrice: 18000, menuItemId: rizMenu.id, organizationId: nirina.id,
      ingredients: { create: [
        { stockItemId: rizIng.id, quantity: 0.2, unit: 'kg' },
        { stockItemId: huileIng.id, quantity: 0.03, unit: 'L' },
        { stockItemId: tomateIng.id, quantity: 0.05, unit: 'kg' },
      ] },
    },
  });
  await p.recipe.create({
    data: { name: 'Poulet roti', yield: 1, sellingPrice: 25000, menuItemId: pouletMenu.id, organizationId: nirina.id,
      ingredients: { create: [
        { stockItemId: pouletIng.id, quantity: 0.5, unit: 'kg' },
        { stockItemId: huileIng.id, quantity: 0.05, unit: 'L' },
      ] },
    },
  });

  // ═══ 10. Caisse ═══
  console.log('10. Caisse');
  await p.cashRegister.create({
    data: { name: 'Caisse principale', type: 'CAISSE', location: 'Reception', currentBalance: 0, status: 'CLOSED', organizationId: nirina.id },
  });

  console.log('\n✅ SEED TERMINE');
  console.log('  2 orgs, 2 users, ' + mods.length + ' modules, ' + items.length + ' articles, ' + clients.length + ' clients, ' + supplierPartners.length + ' fournisseurs, ' + rooms.length + ' chambres, ' + resas.length + ' resas, ' + menu.length + ' menu, ' + tables.length + ' tables, 3 recettes');
  console.log('\n  Login ADMIN  : admin@nexus.com / Admin123!');
  console.log('  Login HOTEL  : rakoto@gmail.com / Rakoto123!');
}

main().catch(e => { console.error(e); process.exit(1); }).finally(() => p.$disconnect());
