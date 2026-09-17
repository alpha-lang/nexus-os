import { Injectable, NotFoundException, ForbiddenException, ConflictException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class CustomersService {
  constructor(private prisma: PrismaService) {}

  private async isInternalOrg(user: any) {
    if (!user.organizationId) return user.role === 'SUPER_ADMIN';
    const org = await this.prisma.organization.findUnique({ where: { id: user.organizationId } });
    return org?.type === 'INTERNE' || user.role === 'SUPER_ADMIN';
  }

  // ═══════════════════════════════════════════════════════
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
  //  PARTNERS (vue unifiee)
  // ═══════════════════════════════════════════════════════
  async findAllPartners(user: any, filters: any = {}) {
    const canSeeAll = await this.isInternalOrg(user);
    const where: any = {};
    if (!canSeeAll) {
      if (!user.organizationId) throw new ForbiddenException('Organisation requise');
      where.organizationId = user.organizationId;
    }
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

    // Stats fournisseur (si applicable)
    const purchaseOrders = await this.prisma.purchaseOrder.findMany({
      where: { supplierId: id },
      include: { items: { include: { stockItem: { select: { name: true, unit: true } } } } },
      orderBy: { createdAt: 'desc' },
    });
    const stockItems = await this.prisma.stockItem.findMany({
      where: { supplierId: id },
      select: { id: true, name: true, sku: true, unit: true, currentStock: true, minStock: true, costPrice: true },
    });

    const totalOrders = purchaseOrders.length;
    const totalPurchases = purchaseOrders
      .filter(o => o.status === 'RECEIVED' || o.status === 'PARTIAL')
      .reduce((s, o) => s + (o.totalAmount || 0), 0);
    const pendingOrders = purchaseOrders.filter(o => o.status === 'SENT' || o.status === 'PARTIAL').length;
    const lastOrderAt = purchaseOrders[0]?.createdAt || null;

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
      purchaseOrders,
      stockItems,
      timeline,
      stats: {
        // Client
        totalReservations,
        totalSales,
        totalSpent,
        totalPaid,
        outstanding: totalSpent - totalPaid,
        lastVisit,
        // Fournisseur
        totalOrders,
        totalPurchases,
        pendingOrders,
        lastOrderAt,
        totalStockItems: stockItems.length,
      },
    };
  }

  async findAll(user: any) {
    const canSeeAll = await this.isInternalOrg(user);
    const where: any = { type: 'CUSTOMER' };
    if (!canSeeAll) where.organizationId = user.organizationId;
    return this.prisma.partner.findMany({
      where,
      include: {
        organization: { select: { id: true, name: true } },
        user: { select: { id: true, email: true, role: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string, user: any) {
    const canSeeAll = await this.isInternalOrg(user);
    const where: any = { id };
    if (!canSeeAll) where.organizationId = user.organizationId;
    const customer = await this.prisma.partner.findFirst({ where, include: { organization: true, user: true } });
    if (!customer) throw new NotFoundException('Partenaire introuvable');
    return customer;
  }

  async findFull(id: string, user: any) {
    const canSeeAll = await this.isInternalOrg(user);
    const where: any = { id };
    if (!canSeeAll) where.organizationId = user.organizationId;

    const customer = await this.prisma.partner.findFirst({
      where,
      include: {
        organization: { select: { id: true, name: true, type: true } },
        user: { select: { id: true, email: true, role: true, isActive: true } },
        customerNotes: {
          include: { author: { select: { id: true, name: true, email: true } } },
          orderBy: { createdAt: 'desc' },
        },
        documents: { orderBy: { createdAt: 'desc' } },
      },
    });
    if (!customer) throw new NotFoundException('Partenaire introuvable');

    const [reservations, sales, posSales] = await Promise.all([
      this.prisma.reservation.findMany({
        where: { customerId: id },
        include: { room: { include: { roomType: true } } },
        orderBy: { checkInDate: 'desc' },
      }),
      this.prisma.sale.findMany({
        where: { customerId: id },
        include: { module: true, catalogItem: true },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.posSale.findMany({
        where: { customerId: id },
        include: {
          items: { include: { menuItem: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    const totalReservations = reservations.length;
    const totalSales = sales.length;
    const totalSpent =
      reservations.reduce((sum, r) => sum + (r.totalAmount || 0), 0) +
      sales.reduce((sum, s) => sum + (s.total || 0), 0) +
      posSales.reduce((sum, s) => sum + (s.total || 0), 0);
    const totalPaid =
      reservations.reduce((sum, r) => sum + (r.paidAmount || 0), 0);
    const lastVisit = reservations[0]?.checkOutDate || reservations[0]?.checkInDate || null;

    // ═══ TIMELINE : agréger tout ═══
    const timeline: any[] = [];

    reservations.forEach((r) => {
      timeline.push({
        id: r.id,
        type: 'RESERVATION',
        date: r.createdAt,
        title: `Réservation ${r.reference}`,
        description: `Chambre ${r.room?.number} — ${r.room?.roomType?.name}`,
        amount: r.totalAmount,
        paidAmount: r.paidAmount,
        status: r.status,
        icon: 'calendar',
        extra: {
          checkIn: r.checkInDate,
          checkOut: r.checkOutDate,
          nights: Math.max(1, Math.ceil((new Date(r.checkOutDate).getTime() - new Date(r.checkInDate).getTime()) / (1000 * 60 * 60 * 24))),
        },
      });
    });

    sales.forEach((s) => {
      timeline.push({
        id: s.id,
        type: 'SALE',
        date: s.createdAt,
        title: s.catalogItem?.name || s.module?.name || 'Vente',
        description: `Qté ${s.quantity}`,
        amount: s.total,
        status: 'PAID',
        icon: 'cart',
      });
    });

    posSales.forEach((p: any) => {
      timeline.push({
        id: p.id,
        type: 'POS_SALE',
        date: p.createdAt,
        title: 'Vente comptoir',
        description: (p.items || []).map((i: any) => `${i.quantity}× ${i.menuItem.name}`).join(', '),
        amount: p.total,
        paidAmount: p.total,
        status: p.status,
        icon: 'receipt',
      });
    });

    customer.customerNotes.forEach((n) => {
      timeline.push({
        id: n.id,
        type: 'NOTE',
        date: n.createdAt,
        title: 'Note',
        description: n.content,
        icon: 'note',
        extra: { author: n.author?.name },
      });
    });

    timeline.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return {
      ...customer,
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

  async create(data: any, user: any) {
    const canCreateForAny = await this.isInternalOrg(user);
    let organizationId = user.organizationId;
    if (canCreateForAny) {
      if (!data.organizationId) throw new BadRequestException('Veuillez sélectionner une organisation pour ce client.');
      organizationId = data.organizationId;
    } else if (!organizationId) {
      throw new NotFoundException('Organisation requise');
    }

    let createdUserId: string | null = null;

    if (data.createUser) {
      if (user.role !== 'SUPER_ADMIN') {
        throw new ForbiddenException('Seul un Super Admin peut créer un compte utilisateur pour un client.');
      }
      if (data.userRole === 'SUPER_ADMIN') throw new ForbiddenException('Impossible de créer un Super Admin ici.');

      const existingUser = await this.prisma.user.findUnique({ where: { email: data.userEmail } });
      if (existingUser) throw new ConflictException('Cet email est déjà utilisé.');

      const hashedPassword = await bcrypt.hash(data.userPassword, 10);
      const newUser = await this.prisma.user.create({
        data: {
          email: data.userEmail,
          password: hashedPassword,
          name: `${data.firstName} ${data.lastName}`,
          role: data.userRole || 'USER',
          organizationId,
        },
      });
      createdUserId = newUser.id;
    }

    return this.prisma.partner.create({
      data: {
        type: 'CUSTOMER',
        name: data.firstName + ' ' + data.lastName,
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        phone: data.phone,
        address: data.address || null,
        city: data.city || null,
        organizationId,
        userId: createdUserId,
      },
      include: { organization: true, user: true },
    });
  }

  async update(id: string, data: any, user: any) {
    await this.findOne(id, user);

    let createdUserId: string | null = null;
    if (data.createUser && data.userEmail) {
      if (user.role !== 'SUPER_ADMIN') {
        throw new ForbiddenException('Seul un Super Admin peut créer un compte utilisateur pour un client.');
      }
      if (data.userRole === 'SUPER_ADMIN') throw new ForbiddenException('Impossible de créer un Super Admin ici.');

      const existingUser = await this.prisma.user.findUnique({ where: { email: data.userEmail } });
      if (existingUser) throw new ConflictException('Cet email est déjà utilisé.');

      const hashedPassword = await bcrypt.hash(data.userPassword, 10);
      const newUser = await this.prisma.user.create({
        data: {
          email: data.userEmail,
          password: hashedPassword,
          name: `${data.firstName || data.lastName}`,
          role: data.userRole || 'USER',
          organizationId: (await this.findOne(id, user)).organizationId,
        },
      });
      createdUserId = newUser.id;
    }

    return this.prisma.partner.update({
      where: { id },
      data: {
        firstName: data.firstName ?? undefined,
        lastName: data.lastName ?? undefined,
        email: data.email ?? undefined,
        phone: data.phone ?? undefined,
        address: data.address ?? undefined,
        city: data.city ?? undefined,
        userId: createdUserId ?? undefined,
      },
      include: { organization: true, user: true },
    });
  }

  async remove(id: string, user: any) {
    await this.findOne(id, user);
    return this.prisma.partner.delete({ where: { id } });
  }

  // ==========================================
  // TAGS
  // ==========================================
  async addTag(id: string, tag: string, user: any) {
    const customer = await this.findOne(id, user);
    const currentTags = (customer.tags || '').split(',').filter(Boolean);
    if (currentTags.includes(tag)) return customer;
    const tags = [...currentTags, tag].join(',');
    return this.prisma.partner.update({
      where: { id },
      data: { tags },
      select: { id: true, tags: true },
    });
  }

  async removeTag(id: string, tag: string, user: any) {
    const customer = await this.findOne(id, user);
    const currentTags = (customer.tags || '').split(',').filter(Boolean);
    const tags = currentTags.filter((t) => t !== tag).join(',');
    return this.prisma.partner.update({
      where: { id },
      data: { tags },
      select: { id: true, tags: true },
    });
  }

  // ==========================================
  // NOTES
  // ==========================================
  async addNote(id: string, content: string, user: any) {
    await this.findOne(id, user);
    if (!content?.trim()) throw new BadRequestException('Le contenu est requis');
    return this.prisma.customerNote.create({
      data: {
        customerId: id,
        content: content.trim(),
        authorId: user.userId || user.id,
      },
      include: { author: { select: { id: true, name: true, email: true } } },
    });
  }

  async deleteNote(id: string, noteId: string, user: any) {
    await this.findOne(id, user);
    const note = await this.prisma.customerNote.findFirst({ where: { id: noteId, customerId: id } });
    if (!note) throw new NotFoundException('Note introuvable');
    return this.prisma.customerNote.delete({ where: { id: noteId } });
  }

  // ==========================================
  // DOCUMENTS
  // ==========================================
  async addDocument(id: string, data: any, user: any) {
    await this.findOne(id, user);
    if (!data.name || !data.url) throw new BadRequestException('Nom et URL requis');
    return this.prisma.customerDocument.create({
      data: {
        customerId: id,
        name: data.name,
        url: data.url,
        type: data.type || null,
        size: data.size ? parseInt(data.size) : null,
      },
    });
  }

  async deleteDocument(id: string, docId: string, user: any) {
    await this.findOne(id, user);
    const doc = await this.prisma.customerDocument.findFirst({ where: { id: docId, customerId: id } });
    if (!doc) throw new NotFoundException('Document introuvable');
    return this.prisma.customerDocument.delete({ where: { id: docId } });
  }

  async findClientOrganizations() {
    return this.prisma.organization.findMany({
      where: { type: { not: 'INTERNE' } },
      include: { storageQuota: true },
      orderBy: { name: 'asc' },
    });
  }
}
