import { Injectable, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CrmService {
  constructor(private prisma: PrismaService) {}

  private async resolveOrgId(user: any): Promise<string | null> {
    const isSuperAdmin = user.role === 'SUPER_ADMIN' && user.isOwner;
    if (isSuperAdmin) return null; // voit tout
    if (!user.organizationId) throw new ForbiddenException('Organisation requise');
    return user.organizationId;
  }

  private orgFilter(orgId: string | null) {
    return orgId ? { organizationId: orgId } : {};
  }

  // ═══════════════════════════════════════════════════════════
  // 1. VUE D'ENSEMBLE
  // ═══════════════════════════════════════════════════════════
  async getOverview(user: any) {
    const orgId = await this.resolveOrgId(user);
    const where = this.orgFilter(orgId);

    const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000);

    const [
      totalPartners,
      clients,
      suppliers,
      both,
      newThisMonth,
      recentInteractions,
      recentPartners,
      topClients,
      totalInteractions,
      totalNotes,
      totalDocuments,
    ] = await Promise.all([
      this.prisma.partner.count({ where }),
      this.prisma.partner.count({ where: { ...where, type: 'CUSTOMER' } }),
      this.prisma.partner.count({ where: { ...where, type: 'SUPPLIER' } }),
      this.prisma.partner.count({ where: { ...where, type: 'BOTH' } }),
      this.prisma.partner.count({ where: { ...where, createdAt: { gte: thirtyDaysAgo } } }),

      // 5 dernières interactions
      this.prisma.interaction.findMany({
        where,
        include: {
          partner: { select: { id: true, name: true, type: true } },
          user: { select: { name: true, email: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 5,
      }),

      // 5 derniers partenaires créés
      this.prisma.partner.findMany({
        where,
        select: {
          id: true, name: true, type: true, city: true,
          email: true, phone: true, createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
        take: 5,
      }),

      // Top 5 clients par activité (reservations + pos sales)
      this.getTopClients(orgId, 5),

      this.prisma.interaction.count({ where }),
      this.prisma.customerNote.count({ where: orgId ? { customer: { organizationId: orgId } } : {} }),
      this.prisma.customerDocument.count({ where: orgId ? { customer: { organizationId: orgId } } : {} }),
    ]);

    return {
      kpis: {
        totalPartners,
        clients,
        suppliers,
        both,
        newThisMonth,
        totalInteractions,
        totalNotes,
        totalDocuments,
      },
      recentInteractions,
      recentPartners,
      topClients,
    };
  }

  private async getTopClients(orgId: string | null, limit: number) {
    // Récupère les partners CUSTOMER avec leur nombre de réservations + total dépensé
    const partners = await this.prisma.partner.findMany({
      where: {
        ...this.orgFilter(orgId),
        type: { in: ['CUSTOMER', 'BOTH'] },
      },
      select: {
        id: true, name: true, city: true, email: true, phone: true,
        reservations: {
          select: { totalAmount: true, paidAmount: true },
        },
      },
      take: 200, // fenêtre glissante
    });

    return partners
      .map((p) => {
        const totalSpent = p.reservations.reduce((s, r) => s + (r.totalAmount || 0), 0);
        const totalPaid = p.reservations.reduce((s, r) => s + (r.paidAmount || 0), 0);
        return {
          id: p.id,
          name: p.name,
          city: p.city,
          email: p.email,
          phone: p.phone,
          reservationsCount: p.reservations.length,
          totalSpent,
          totalPaid,
          outstanding: totalSpent - totalPaid,
        };
      })
      .sort((a, b) => b.totalSpent - a.totalSpent)
      .slice(0, limit);
  }

  // ═══════════════════════════════════════════════════════════
  // 2. ANALYTICS
  // ═══════════════════════════════════════════════════════════
  async getAnalytics(user: any) {
    const orgId = await this.resolveOrgId(user);
    const where = this.orgFilter(orgId);

    const partners = await this.prisma.partner.findMany({
      where,
      select: {
        id: true, name: true, type: true, city: true, segment: true, score: true,
        tags: true, createdAt: true, isActive: true,
        reservations: { select: { totalAmount: true } },
      },
    });

    // 1. Répartition par type
    const byType = {
      CUSTOMER: partners.filter((p) => p.type === 'CUSTOMER').length,
      SUPPLIER: partners.filter((p) => p.type === 'SUPPLIER').length,
      BOTH: partners.filter((p) => p.type === 'BOTH').length,
    };

    // 2. Top villes
    const cityMap: Record<string, number> = {};
    partners.forEach((p) => {
      const c = p.city || 'Non renseigné';
      cityMap[c] = (cityMap[c] || 0) + 1;
    });
    const byCity = Object.entries(cityMap)
      .map(([city, count]) => ({ city, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);

    // 3. Répartition par score
    const byScore = {
      excellent: partners.filter((p) => p.score >= 80).length,
      bon: partners.filter((p) => p.score >= 60 && p.score < 80).length,
      moyen: partners.filter((p) => p.score >= 40 && p.score < 60).length,
      faible: partners.filter((p) => p.score < 40).length,
    };

    // 4. Top tags
    const tagMap: Record<string, number> = {};
    partners.forEach((p) => {
      (p.tags || '').split(',').filter(Boolean).forEach((t) => {
        const tg = t.trim();
        tagMap[tg] = (tagMap[tg] || 0) + 1;
      });
    });
    const byTag = Object.entries(tagMap)
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // 5. Croissance 6 derniers mois
    const now = new Date();
    const monthlyGrowth: { month: string; label: string; count: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const start = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
      const count = partners.filter(
        (p) => p.createdAt >= start && p.createdAt < end,
      ).length;
      monthlyGrowth.push({
        month: `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}`,
        label: start.toLocaleDateString('fr-FR', { month: 'short' }),
        count,
      });
    }

    // 6. Top clients par CA
    const clientsWithRevenue = partners
      .filter((p) => p.type === 'CUSTOMER' || p.type === 'BOTH')
      .map((p) => ({
        id: p.id,
        name: p.name,
        type: p.type,
        totalRevenue: p.reservations.reduce((s, r) => s + (r.totalAmount || 0), 0),
        reservationsCount: p.reservations.length,
      }))
      .sort((a, b) => b.totalRevenue - a.totalRevenue);

    const topClients = await Promise.all(
      clientsWithRevenue.slice(0, 10).map(async (c) => {
        const full = await this.prisma.partner.findUnique({
          where: { id: c.id },
          select: { name: true, city: true },
        });
        return { ...c, name: full?.name || c.name, city: full?.city };
      }),
    );

    const totalRevenue = clientsWithRevenue.reduce((s, c) => s + c.totalRevenue, 0);
    const activePartners = partners.filter((p) => p.isActive).length;

    return {
      summary: {
        totalRevenue,
        activePartners,
        inactivePartners: partners.length - activePartners,
        averageRevenuePerClient:
          clientsWithRevenue.length > 0
            ? Math.round(totalRevenue / clientsWithRevenue.length)
            : 0,
      },
      byType,
      byCity,
      byScore,
      byTag,
      monthlyGrowth,
      topClients,
    };
  }

  // ═══════════════════════════════════════════════════════════
  // 3. INTERACTIONS GLOBALES
  // ═══════════════════════════════════════════════════════════
  async findAllInteractions(user: any, filters: any = {}) {
    const orgId = await this.resolveOrgId(user);
    const where: any = this.orgFilter(orgId);

    if (filters.type) where.type = filters.type;
    if (filters.partnerId) where.partnerId = filters.partnerId;
    if (filters.from || filters.to) {
      where.createdAt = {};
      if (filters.from) where.createdAt.gte = new Date(filters.from);
      if (filters.to) where.createdAt.lte = new Date(filters.to);
    }

    const take = filters.take ? parseInt(filters.take, 10) : 50;

    const items = await this.prisma.interaction.findMany({
      where,
      include: {
        partner: { select: { id: true, name: true, type: true, city: true } },
        user: { select: { id: true, name: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
      take,
    });

    // Stats globales
    const stats = {
      total: await this.prisma.interaction.count({ where: this.orgFilter(orgId) }),
      byType: await this.prisma.interaction.groupBy({
        by: ['type'],
        where: this.orgFilter(orgId),
        _count: true,
      }),
    };

    return { items, stats };
  }

  // ═══════════════════════════════════════════════════════════
  // 4. DOCUMENTS GLOBAUX
  // ═══════════════════════════════════════════════════════════
  async findAllDocuments(user: any, filters: any = {}) {
    const orgId = await this.resolveOrgId(user);
    const where: any = orgId ? { customer: { organizationId: orgId } } : {};

    if (filters.type) where.type = filters.type;
    if (filters.partnerId) where.customerId = filters.partnerId;

    const take = filters.take ? parseInt(filters.take, 10) : 50;

    const items = await this.prisma.customerDocument.findMany({
      where,
      include: {
        customer: { select: { id: true, name: true, type: true, city: true } },
      },
      orderBy: { createdAt: 'desc' },
      take,
    });

    // Stats par type
    const byType = await this.prisma.customerDocument.groupBy({
      by: ['type'],
      where: orgId ? { customer: { organizationId: orgId } } : {},
      _count: true,
    });

    return { items, byType };
  }

  // ═══════════════════════════════════════════════════════════
  // 5. NOTES GLOBALES (bonus)
  // ═══════════════════════════════════════════════════════════
  async findAllNotes(user: any, filters: any = {}) {
    const orgId = await this.resolveOrgId(user);
    const where: any = orgId ? { customer: { organizationId: orgId } } : {};

    if (filters.partnerId) where.customerId = filters.partnerId;

    const take = filters.take ? parseInt(filters.take, 10) : 50;

    const items = await this.prisma.customerNote.findMany({
      where,
      include: {
        customer: { select: { id: true, name: true, type: true } },
        author: { select: { id: true, name: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
      take,
    });

    return { items };
  }
}
