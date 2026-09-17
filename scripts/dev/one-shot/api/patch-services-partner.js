const fs = require('fs');
let total = 0;
function patchFile(path, edits) {
  if (!fs.existsSync(path)) { console.warn(`⚠️ ${path} absent`); return; }
  let s = fs.readFileSync(path, 'utf8');
  let n = 0;
  edits.forEach(([old, neu, label]) => {
    if (!s.includes(old)) { console.warn(`  MISS ${path}::${label}`); return; }
    s = s.replace(old, neu); console.log(`  OK ${path}::${label}`); n++;
  });
  fs.writeFileSync(path, s);
  total += n;
}

// ═══ customers.service.ts ═══
patchFile('src/customers/customers.service.ts', [
  // findAll
  [
    `const where = canSeeAll ? {} : { organizationId: user.organizationId };`,
    `const where: any = { type: 'CUSTOMER' };\n    if (!canSeeAll) where.organizationId = user.organizationId;`,
    'findAll type',
  ],
  // findOne
  [
    `const where = canSeeAll ? { id } : { id, organizationId: user.organizationId };\n    const customer = await this.prisma.partner.findFirst({ where, include: { organization: true, user: true } });`,
    `const where: any = { id, type: 'CUSTOMER' };\n    if (!canSeeAll) where.organizationId = user.organizationId;\n    const customer = await this.prisma.partner.findFirst({ where, include: { organization: true, user: true } });`,
    'findOne type',
  ],
  // findFull
  [
    `const where = canSeeAll ? { id } : { id, organizationId: user.organizationId };\n\n    const customer = await this.prisma.partner.findFirst({\n      where,`,
    `const where: any = { id, type: 'CUSTOMER' };\n    if (!canSeeAll) where.organizationId = user.organizationId;\n\n    const customer = await this.prisma.partner.findFirst({\n      where,`,
    'findFull type',
  ],
  // create — ajouter type + name
  [
    `return this.prisma.partner.create({\n      data: {\n        firstName: data.firstName,\n        lastName: data.lastName,`,
    `return this.prisma.partner.create({\n      data: {\n        type: 'CUSTOMER',\n        name: data.firstName + ' ' + data.lastName,\n        firstName: data.firstName,\n        lastName: data.lastName,`,
    'create type+name',
  ],
]);

// ═══ stock.service.ts ═══
patchFile('src/stock/stock.service.ts', [
  // count suppliers
  [
    `this.prisma.partner.count({ where: { organizationId: orgId } }),`,
    `this.prisma.partner.count({ where: { organizationId: orgId, type: 'SUPPLIER' } }),`,
    'count suppliers',
  ],
  // findAllSuppliers
  [
    `return this.prisma.partner.findMany({\n      where: { organizationId: orgId },\n      include: { _count: { select: { items: true } } },`,
    `return this.prisma.partner.findMany({\n      where: { organizationId: orgId, type: 'SUPPLIER' },\n      include: { _count: { select: { items: true } } },`,
    'findAllSuppliers',
  ],
  // createSupplier
  [
    `return this.prisma.partner.create({\n      data: {\n        name: data.name,\n        contactName: data.contactName || null,`,
    `return this.prisma.partner.create({\n      data: {\n        type: 'SUPPLIER',\n        name: data.name,\n        contactName: data.contactName || null,`,
    'createSupplier type',
  ],
  // updateSupplier findFirst
  [
    `const s = await this.prisma.partner.findFirst({ where: { id, organizationId: orgId } });\n    if (!s) throw new NotFoundException('Fournisseur introuvable');\n    return this.prisma.partner.update({`,
    `const s = await this.prisma.partner.findFirst({ where: { id, organizationId: orgId, type: 'SUPPLIER' } });\n    if (!s) throw new NotFoundException('Fournisseur introuvable');\n    return this.prisma.partner.update({`,
    'updateSupplier type',
  ],
  // removeSupplier findFirst
  [
    `const s = await this.prisma.partner.findFirst({\n      where: { id, organizationId: orgId },\n      include: { _count: { select: { items: true } } },\n    });\n    if (!s) throw new NotFoundException('Fournisseur introuvable');`,
    `const s = await this.prisma.partner.findFirst({\n      where: { id, organizationId: orgId, type: 'SUPPLIER' },\n      include: { _count: { select: { items: true } } },\n    });\n    if (!s) throw new NotFoundException('Fournisseur introuvable');`,
    'removeSupplier type',
  ],
]);

// ═══ purchase-orders.service.ts ═══
patchFile('src/stock/purchase-orders.service.ts', [
  [
    `const supplier = await this.prisma.partner.findFirst({\n      where: { id: data.supplierId, organizationId: orgId },\n    });`,
    `const supplier = await this.prisma.partner.findFirst({\n      where: { id: data.supplierId, organizationId: orgId, type: 'SUPPLIER' },\n    });`,
    'PO supplier type',
  ],
]);

// ═══ dashboard.service.ts ═══
patchFile('src/dashboard/dashboard.service.ts', [
  [
    `this.prisma.partner.count({ where: { organizationId: orgId } }),`,
    `this.prisma.partner.count({ where: { organizationId: orgId, type: 'CUSTOMER' } }),`,
    'dashboard customer count',
  ],
]);

// ═══ search.service.ts ═══
patchFile('src/search/search.service.ts', [
  [
    `this.prisma.partner.findMany({\n        where: {\n          ...orgFilter,`,
    `this.prisma.partner.findMany({\n        where: {\n          ...orgFilter,\n          type: 'CUSTOMER',`,
    'search customer type',
  ],
]);

// ═══ storage.service.ts ═══
patchFile('src/storage/storage.service.ts', [
  [
    `this.prisma.partner.count({ where: { organizationId } }),`,
    `this.prisma.partner.count({ where: { organizationId, type: 'CUSTOMER' } }),`,
    'storage count',
  ],
  [
    `this.prisma.partner.findMany({ where: { organizationId: orgId } }),`,
    `this.prisma.partner.findMany({ where: { organizationId: orgId, type: 'CUSTOMER' } }),`,
    'storage findMany',
  ],
]);

console.log(`\n✅ ${total} patch(es) applique(s)`);
