const fs = require('fs');
const p = 'src/customers/customers.service.ts';
let s = fs.readFileSync(p, 'utf8');
let n = 0;
function tryR(old, neu, label) {
  if (!s.includes(old)) { console.warn(`  MISS ${label}`); return false; }
  s = s.replace(old, neu); console.log(`  OK ${label}`); n++; return true;
}

console.log('Fix findOne/findFull pour accepter tous types...');

// findOne : retirer type filter
tryR(
  `  async findOne(id: string, user: any) {
    const canSeeAll = await this.isInternalOrg(user);
    const where: any = { id, type: 'CUSTOMER' };
    if (!canSeeAll) where.organizationId = user.organizationId;
    const customer = await this.prisma.partner.findFirst({ where, include: { organization: true, user: true } });
    if (!customer) throw new NotFoundException('Client introuvable');
    return customer;
  }`,
  `  async findOne(id: string, user: any) {
    const canSeeAll = await this.isInternalOrg(user);
    const where: any = { id };
    if (!canSeeAll) where.organizationId = user.organizationId;
    const customer = await this.prisma.partner.findFirst({ where, include: { organization: true, user: true } });
    if (!customer) throw new NotFoundException('Partenaire introuvable');
    return customer;
  }`,
  'findOne sans type filter'
);

// findFull : retirer type filter
tryR(
  `  async findFull(id: string, user: any) {
    const canSeeAll = await this.isInternalOrg(user);
    const where: any = { id, type: 'CUSTOMER' };
    if (!canSeeAll) where.organizationId = user.organizationId;`,
  `  async findFull(id: string, user: any) {
    const canSeeAll = await this.isInternalOrg(user);
    const where: any = { id };
    if (!canSeeAll) where.organizationId = user.organizationId;`,
  'findFull sans type filter'
);

// Message "Client introuvable" → "Partenaire introuvable" (pour cohérence)
s = s.replace(/throw new NotFoundException\('Client introuvable'\)/g, "throw new NotFoundException('Partenaire introuvable')");

fs.writeFileSync(p, s);
console.log(`\n✅ ${n}/2 fix`);
