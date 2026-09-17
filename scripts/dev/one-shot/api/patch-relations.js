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
// notes → customerNotes
patchFile('src/customers/customers.service.ts', [
  [
    `notes: {
          include: { author: { select: { id: true, name: true, email: true } } },
          orderBy: { createdAt: 'desc' },
        },`,
    `customerNotes: {
          include: { author: { select: { id: true, name: true, email: true } } },
          orderBy: { createdAt: 'desc' },
        },`,
    'findFull customerNotes'
  ],
  [
    `customer.notes.forEach((n) => {`,
    `customer.customerNotes.forEach((n) => {`,
    'timeline customerNotes'
  ],
]);

// ═══ dashboard.service.ts : _count.customers → _count.partners ═══
patchFile('src/dashboard/dashboard.service.ts', [
  [
    `_count: { select: { users: true, customers: true } },`,
    `_count: { select: { users: true, partners: true } },`,
    '_count.partners'
  ],
]);

// ═══ organizations.service.ts : idem ═══
patchFile('src/organizations/organizations.service.ts', [
  [
    `_count: { select: { users: true, customers: true } },`,
    `_count: { select: { users: true, partners: true } },`,
    '_count.partners'
  ],
]);

// ═══ stock.service.ts : _count.items → _count.stockItems ═══
patchFile('src/stock/stock.service.ts', [
  [
    `include: { _count: { select: { items: true } } },`,
    `include: { _count: { select: { stockItems: true } } },`,
    '_count.stockItems (2x)'
  ],
]);

// ═══ stock.service.ts : s._count.items → s._count.stockItems ═══
patchFile('src/stock/stock.service.ts', [
  [
    `if (s._count.items > 0) throw new BadRequestException('Des articles sont lies a ce fournisseur');`,
    `if (s._count.stockItems > 0) throw new BadRequestException('Des articles sont lies a ce fournisseur');`,
    's._count.stockItems'
  ],
]);

// ═══ customers.service.ts : tags String[] → String (CSV) ═══
patchFile('src/customers/customers.service.ts', [
  [
    `if (customer.tags?.includes(tag)) return customer;
    const tags = [...(customer.tags || []), tag];
    return this.prisma.partner.update({
      where: { id },
      data: { tags },`,
    `const currentTags = (customer.tags || '').split(',').filter(Boolean);
    if (currentTags.includes(tag)) return customer;
    const tags = [...currentTags, tag].join(',');
    return this.prisma.partner.update({
      where: { id },
      data: { tags },`,
    'addTag CSV'
  ],
  [
    `const tags = (customer.tags || []).filter((t: string) => t !== tag);
    return this.prisma.partner.update({
      where: { id },
      data: { tags },`,
    `const currentTags = (customer.tags || '').split(',').filter(Boolean);
    const tags = currentTags.filter((t) => t !== tag).join(',');
    return this.prisma.partner.update({
      where: { id },
      data: { tags },`,
    'removeTag CSV'
  ],
]);

console.log(`\n✅ ${total} patch(es)`);
