const fs = require('fs');
const p = 'src/customers/customers.service.ts';
let s = fs.readFileSync(p, 'utf8');

if (s.includes('findAllPartners')) {
  console.log('SKIP');
  process.exit(0);
}

// Ajouter en haut de la classe (après constructor)
const anchor = `  async findAll(user: any) {`;

const methods = `  // ═══════════════════════════════════════════════════════
  //  PARTNERS (vue unifiee)
  // ═══════════════════════════════════════════════════════
  async findAllPartners(user: any, filters: any = {}) {
    const orgId = user.organizationId;
    if (!orgId) throw new ForbiddenException('Organisation requise');
    const where: any = { organizationId: orgId };
    if (filters.type) where.type = filters.type;
    return this.prisma.partner.findMany({
      where,
      orderBy: { name: 'asc' },
    });
  }

  async findOnePartner(user: any, id: string) {
    const orgId = user.organizationId;
    if (!orgId) throw new ForbiddenException('Organisation requise');
    const partner = await this.prisma.partner.findFirst({
      where: { id, organizationId: orgId },
      include: { organization: true, user: true },
    });
    if (!partner) throw new NotFoundException('Partenaire introuvable');
    return partner;
  }

  async findFullPartner(user: any, id: string) {
    const orgId = user.organizationId;
    if (!orgId) throw new ForbiddenException('Organisation requise');
    const partner = await this.prisma.partner.findFirst({
      where: { id, organizationId: orgId },
      include: {
        organization: true,
        user: true,
        customerNotes: { include: { author: { select: { id: true, name: true, email: true } } }, orderBy: { createdAt: 'desc' } },
        documents: { orderBy: { createdAt: 'desc' } },
      },
    });
    if (!partner) throw new NotFoundException('Partenaire introuvable');

    // Stats communes
    const [reservations, sales, posSales] = await Promise.all([
      this.prisma.reservation.findMany({ where: { customerId: id }, include: { room: { include: { roomType: true } } }, orderBy: { checkInDate: 'desc' } }),
      this.prisma.sale.findMany({ where: { customerId: id }, include: { module: true, catalogItem: true }, orderBy: { createdAt: 'desc' } }),
      this.prisma.posSale.findMany({ where: { customerId: id }, include: { items: { include: { menuItem: true } } }, orderBy: { createdAt: 'desc' } }),
    ]);

    const totalReservations = reservations.length;
    const totalSales = sales.length;
    const totalSpent =
      reservations.reduce((s, r) => s + (r.totalAmount || 0), 0) +
      sales.reduce((s, x) => s + (x.total || 0), 0) +
      posSales.reduce((s, x) => s + (x.total || 0), 0);
    const totalPaid = reservations.reduce((s, r) => s + (r.paidAmount || 0), 0);
    const lastVisit = reservations[0]?.checkOutDate || reservations[0]?.checkInDate || null;

    const timeline: any[] = [];
    reservations.forEach((r) => {
      timeline.push({ id: r.id, type: 'RESERVATION', date: r.createdAt, title: 'Reservation ' + r.reference, description: 'Chambre ' + r.room?.number, amount: r.totalAmount, paidAmount: r.paidAmount, status: r.status, icon: 'calendar' });
    });
    sales.forEach((x) => timeline.push({ id: x.id, type: 'SALE', date: x.createdAt, title: x.catalogItem?.name || x.module?.name || 'Vente', description: 'Qte ' + x.quantity, amount: x.total, status: 'PAID', icon: 'cart' }));
    posSales.forEach((x: any) => timeline.push({ id: x.id, type: 'POS_SALE', date: x.createdAt, title: 'Vente comptoir', description: (x.items || []).map((i: any) => i.quantity + 'x ' + i.menuItem.name).join(', '), amount: x.total, paidAmount: x.total, status: x.status, icon: 'receipt' }));
    (partner.customerNotes || []).forEach((n: any) => timeline.push({ id: n.id, type: 'NOTE', date: n.createdAt, title: 'Note', description: n.content, icon: 'note', extra: { author: n.author?.name } }));
    timeline.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return {
      ...partner,
      reservations,
      sales,
      posSales,
      timeline,
      stats: {
        totalReservations,
        totalSales,
        totalSpent,
        totalPaid,
        outstanding: totalSpent - totalPaid,
        lastVisit,
      },
    };
  }

  async findAll(user: any) {`;

if (!s.includes(anchor)) { console.error('❌ anchor introuvable'); process.exit(1); }
s = s.replace(anchor, methods);
fs.writeFileSync(p, s);
console.log('✅ findAllPartners/findOnePartner/findFullPartner ajoutes');
