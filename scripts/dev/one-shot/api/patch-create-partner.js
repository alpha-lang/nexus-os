const fs = require('fs');
let n = 0;

// ═══ Controller : ajouter POST /partners ═══
const ctrlPath = 'src/partners/partners.controller.ts';
let ctrl = fs.readFileSync(ctrlPath, 'utf8');
if (!ctrl.includes("@Post()")) {
  ctrl = ctrl.replace(
    `  @Get(':id/full')`,
    `  @Post()
  create(@CurrentUser() u: any, @Body() b: any) {
    return this.service.createPartner(u, b);
  }

  @Get(':id/full')`
  );
  fs.writeFileSync(ctrlPath, ctrl);
  console.log('  OK Controller POST /partners');
  n++;
} else {
  console.log('  SKIP Controller deja patche');
}

// ═══ Service : ajouter createPartner ═══
const svcPath = 'src/customers/customers.service.ts';
let svc = fs.readFileSync(svcPath, 'utf8');
if (!svc.includes('createPartner')) {
  const anchor = `  // ═══════════════════════════════════════════════════════
  //  PARTNERS (vue unifiee)`;
  const method = `  // ═══════════════════════════════════════════════════════
  //  CREATE PARTNER (client / fournisseur / les deux)
  // ═══════════════════════════════════════════════════════
  async createPartner(user: any, data: any) {
    const orgId = user.organizationId;
    if (!orgId) throw new ForbiddenException('Organisation requise');

    const validTypes = ['CUSTOMER', 'SUPPLIER', 'BOTH'];
    const type = validTypes.includes(data.type) ? data.type : 'CUSTOMER';

    if (!data.name || !data.name.trim()) {
      throw new BadRequestException('Le nom est requis');
    }

    return this.prisma.partner.create({
      data: {
        type,
        name: data.name.trim(),
        firstName: data.firstName?.trim() || null,
        lastName: data.lastName?.trim() || null,
        email: data.email?.trim() || null,
        phone: data.phone?.trim() || null,
        address: data.address?.trim() || null,
        city: data.city?.trim() || null,
        contactName: data.contactName?.trim() || null,
        leadTimeDays: data.leadTimeDays != null ? parseInt(data.leadTimeDays) : null,
        notes: data.notes?.trim() || null,
        organizationId: orgId,
      },
    });
  }

  // ═══════════════════════════════════════════════════════
  //  PARTNERS (vue unifiee)`;

  if (!svc.includes(anchor)) { console.error('❌ anchor introuvable'); process.exit(1); }
  svc = svc.replace(anchor, method);
  fs.writeFileSync(svcPath, svc);
  console.log('  OK Service createPartner');
  n++;
} else {
  console.log('  SKIP Service deja patche');
}

console.log(`\n✅ ${n} patch(es)`);
