import { Injectable, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DashboardService {
  constructor(private prisma: PrismaService) {}

  async getStats(user: any) {
    // Super admin owner : stats de la plateforme
    if (user.role === 'SUPER_ADMIN' && user.isOwner) {
      return this.getSuperAdminStats();
    }

    if (!user.organizationId) {
      throw new ForbiddenException('Organisation requise');
    }

    const org = await this.prisma.organization.findUnique({
      where: { id: user.organizationId },
    });
    if (!org) throw new ForbiddenException('Organisation introuvable');

    if (org.type === 'HOTEL') return this.getHotelStats(user.organizationId);
    if (org.type === 'COMMERCE') return this.getCommerceStats(user.organizationId);

    return this.getGenericStats(user.organizationId);
  }

  // ==============================
  // SUPER ADMIN — NEXUS CORP
  // ==============================
  private async getSuperAdminStats() {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Toutes les requêtes en parallèle
    const [
      totalOrganizations,
      activeOrganizations,
      internalOrganizations,
      totalUsers,
      activeUsers,
      totalSubscriptions,
      activeSubscriptions,
      trialSubscriptions,
      suspendedSubscriptions,
      expiredSubscriptions,
      monthPayments,
      lastMonthPayments,
      pendingPayments,
      totalModules,
      recentOrgs,
      recentPayments,
      orgsByType,
      monthlyRevenue,
      topOrgsByRevenue,
    ] = await Promise.all([
      // Organisations
      this.prisma.organization.count({ where: { type: { not: 'INTERNE' } } }),
      this.prisma.organization.count({ where: { type: { not: 'INTERNE' }, status: 'ACTIVE' } }),
      this.prisma.organization.count({ where: { type: 'INTERNE' } }),

      // Users
      this.prisma.user.count(),
      this.prisma.user.count({ where: { isActive: true } }),

      // Subscriptions
      this.prisma.subscription.count({
        where: { organization: { type: { not: 'INTERNE' } } },
      }),
      this.prisma.subscription.count({
        where: { status: 'ACTIVE', organization: { type: { not: 'INTERNE' } } },
      }),
      this.prisma.subscription.count({
        where: { status: 'TRIAL', organization: { type: { not: 'INTERNE' } } },
      }),
      this.prisma.subscription.count({
        where: { status: 'SUSPENDED', organization: { type: { not: 'INTERNE' } } },
      }),
      this.prisma.subscription.count({
        where: { status: 'EXPIRED', organization: { type: { not: 'INTERNE' } } },
      }),

      // Paiements du mois
      this.prisma.payment.aggregate({
        where: {
          date: { gte: monthStart },
          status: 'PAID',
          organization: { type: { not: 'INTERNE' } },
        },
        _sum: { amount: true },
        _count: true,
      }),
      this.prisma.payment.aggregate({
        where: {
          date: { gte: lastMonthStart, lt: monthStart },
          status: 'PAID',
          organization: { type: { not: 'INTERNE' } },
        },
        _sum: { amount: true },
      }),
      this.prisma.payment.count({
        where: { status: 'PENDING', organization: { type: { not: 'INTERNE' } } },
      }),

      // Modules
      this.prisma.module.count({ where: { status: 'ACTIVE' } }),

      // Organisations récentes
      this.prisma.organization.findMany({
        where: { type: { not: 'INTERNE' } },
        orderBy: { createdAt: 'desc' },
        take: 5,
        include: {
          _count: { select: { users: true, partners: true } },
          subscriptions: {
            select: { status: true, activeModules: { where: { isActive: true } } },
            orderBy: { createdAt: 'desc' },
            take: 1,
          },
        },
      }),

      // Paiements récents
      this.prisma.payment.findMany({
        where: { organization: { type: { not: 'INTERNE' } } },
        orderBy: { date: 'desc' },
        take: 5,
        include: { organization: { select: { id: true, name: true, type: true } } },
      }),

      // Répartition par type
      this.prisma.organization.groupBy({
        by: ['type'],
        where: { type: { not: 'INTERNE' } },
        _count: true,
      }),

      // Revenus des 6 derniers mois
      this.getMonthlyRevenue(6),

      // Top organisations par CA
      this.prisma.payment.groupBy({
        by: ['organizationId'],
        where: {
          status: 'PAID',
          date: { gte: thirtyDaysAgo },
          organization: { type: { not: 'INTERNE' } },
        },
        _sum: { amount: true },
        orderBy: { _sum: { amount: 'desc' } },
        take: 5,
      }),
    ]);

    const currentRevenue = monthPayments._sum.amount || 0;
    const prevRevenue = lastMonthPayments._sum.amount || 0;
    const revenueGrowth =
      prevRevenue > 0 ? Math.round(((currentRevenue - prevRevenue) / prevRevenue) * 100) : 0;

    // Récupérer les noms des top orga
    const topOrgIds = topOrgsByRevenue.map((t) => t.organizationId);
    const topOrgs = topOrgIds.length
      ? await this.prisma.organization.findMany({
          where: { id: { in: topOrgIds } },
          select: { id: true, name: true, type: true },
        })
      : [];

    return {
      type: 'SUPER_ADMIN',
      overview: {
        organizations: {
          total: totalOrganizations,
          active: activeOrganizations,
          internal: internalOrganizations,
        },
        users: {
          total: totalUsers,
          active: activeUsers,
        },
        modules: {
          total: totalModules,
        },
      },
      subscriptions: {
        total: totalSubscriptions,
        active: activeSubscriptions,
        trial: trialSubscriptions,
        suspended: suspendedSubscriptions,
        expired: expiredSubscriptions,
      },
      revenue: {
        currentMonth: currentRevenue,
        previousMonth: prevRevenue,
        growth: revenueGrowth,
        paymentsThisMonth: monthPayments._count,
        pendingCount: pendingPayments,
      },
      distribution: {
        byType: orgsByType.map((o) => ({
          type: o.type || 'AUTRE',
          count: o._count,
        })),
      },
      monthlyRevenue,
      recentOrgs,
      recentPayments,
      topOrgsByRevenue: topOrgsByRevenue.map((t) => {
        const org = topOrgs.find((o) => o.id === t.organizationId);
        return {
          id: t.organizationId,
          name: org?.name || '—',
          type: org?.type || '—',
          revenue: t._sum.amount || 0,
        };
      }),
    };
  }

  private async getMonthlyRevenue(months: number) {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth() - (months - 1), 1);

    // Une seule requête groupBy au lieu d'une par mois
    const rows = await this.prisma.$queryRaw<{ m: Date; total: number }[]>`
      SELECT date_trunc('month', p.date) AS m,
             COALESCE(SUM(p.amount), 0)::float AS total
      FROM "Payment" p
      JOIN "Organization" o ON o.id = p."organizationId"
      WHERE p.date >= ${start}
        AND p.status = 'PAID'
        AND o.type <> 'INTERNE'
      GROUP BY 1
      ORDER BY 1
    `;

    // Index par YYYY-MM
    const byMonth = new Map<string, number>();
    for (const r of rows) {
      const d = new Date(r.m);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      byMonth.set(key, Number(r.total) || 0);
    }

    const result: { month: string; label: string; revenue: number }[] = [];
    for (let i = months - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      result.push({
        month: key,
        label: d.toLocaleDateString('fr-FR', { month: 'short' }),
        revenue: byMonth.get(key) || 0,
      });
    }
    return result;
  }

  private async getHotelStats(orgId: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    const lastMonthStart = new Date(today.getFullYear(), today.getMonth() - 1, 1);

    const [
      totalRooms,
      occupiedRooms,
      availableRooms,
      cleaningRooms,
      arrivalsToday,
      departuresToday,
      inHouse,
      pendingReservations,
      monthRevenue,
      lastMonthRevenue,
      recentReservations,
      topRooms,
    ] = await Promise.all([
      this.prisma.room.count({ where: { organizationId: orgId } }),
      this.prisma.room.count({ where: { organizationId: orgId, status: 'OCCUPIED' } }),
      this.prisma.room.count({ where: { organizationId: orgId, status: 'AVAILABLE' } }),
      this.prisma.room.count({ where: { organizationId: orgId, status: 'CLEANING' } }),
      this.prisma.reservation.count({
        where: {
          organizationId: orgId,
          checkInDate: { gte: today, lt: tomorrow },
          status: { in: ['PENDING', 'CONFIRMED'] },
        },
      }),
      this.prisma.reservation.count({
        where: {
          organizationId: orgId,
          checkOutDate: { gte: today, lt: tomorrow },
          status: 'CHECKED_IN',
        },
      }),
      this.prisma.reservation.count({
        where: { organizationId: orgId, status: 'CHECKED_IN' },
      }),
      this.prisma.reservation.count({
        where: { organizationId: orgId, status: 'PENDING' },
      }),
      this.prisma.reservation.aggregate({
        where: { organizationId: orgId, createdAt: { gte: monthStart }, status: { not: 'CANCELLED' } },
        _sum: { totalAmount: true },
      }),
      this.prisma.reservation.aggregate({
        where: {
          organizationId: orgId,
          createdAt: { gte: lastMonthStart, lt: monthStart },
          status: { not: 'CANCELLED' },
        },
        _sum: { totalAmount: true },
      }),
      this.prisma.reservation.findMany({
        where: { organizationId: orgId },
        include: { customer: true, room: { include: { roomType: true } } },
        orderBy: { createdAt: 'desc' },
        take: 5,
      }),
      this.prisma.reservation.groupBy({
        by: ['roomId'],
        where: { organizationId: orgId, status: { not: 'CANCELLED' } },
        _count: { roomId: true },
        orderBy: { _count: { roomId: 'desc' } },
        take: 5,
      }),
    ]);

    const roomIds = topRooms.map((r) => r.roomId);
    const roomDetails = roomIds.length
      ? await this.prisma.room.findMany({
          where: { id: { in: roomIds } },
          include: { roomType: true },
        })
      : [];

    const topRoomsWithNames = topRooms.map((tr) => {
      const room = roomDetails.find((r) => r.id === tr.roomId);
      return {
        number: room?.number || '—',
        type: room?.roomType?.name || '—',
        count: tr._count.roomId,
      };
    });

    const revenue = monthRevenue._sum.totalAmount || 0;
    const prevRevenue = lastMonthRevenue._sum.totalAmount || 0;
    const revenueGrowth = prevRevenue > 0 ? Math.round(((revenue - prevRevenue) / prevRevenue) * 100) : 0;

    return {
      type: 'HOTEL',
      occupancy: {
        totalRooms,
        occupiedRooms,
        availableRooms,
        cleaningRooms,
        rate: totalRooms > 0 ? Math.round((occupiedRooms / totalRooms) * 100) : 0,
      },
      today: {
        arrivals: arrivalsToday,
        departures: departuresToday,
        inHouse,
        pending: pendingReservations,
      },
      revenue: {
        currentMonth: revenue,
        previousMonth: prevRevenue,
        growth: revenueGrowth,
      },
      recentReservations,
      topRooms: topRoomsWithNames,
    };
  }

  private async getCommerceStats(orgId: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);

    const [totalProducts, lowStock, monthSales, recentSales, topProducts] = await Promise.all([
      this.prisma.catalogItem.count({ where: { organizationId: orgId } }),
      this.prisma.catalogItem.count({ where: { organizationId: orgId, stock: { lt: 10 } } }),
      this.prisma.sale.aggregate({
        where: { organizationId: orgId, createdAt: { gte: monthStart } },
        _sum: { total: true },
        _count: true,
      }),
      this.prisma.sale.findMany({
        where: { organizationId: orgId },
        include: { customer: true, catalogItem: true },
        orderBy: { createdAt: 'desc' },
        take: 5,
      }),
      this.prisma.sale.groupBy({
        by: ['catalogItemId'],
        where: { organizationId: orgId },
        _sum: { total: true, quantity: true },
        orderBy: { _sum: { total: 'desc' } },
        take: 5,
      }),
    ]);

    const productIds = topProducts.map((t) => t.catalogItemId).filter(Boolean) as string[];
    const products = productIds.length
      ? await this.prisma.catalogItem.findMany({ where: { id: { in: productIds } } })
      : [];

    return {
      type: 'COMMERCE',
      inventory: { totalProducts, lowStock },
      sales: {
        monthRevenue: monthSales._sum.total || 0,
        monthCount: monthSales._count || 0,
      },
      recentSales,
      topProducts: topProducts.map((t) => {
        const p = products.find((pr) => pr.id === t.catalogItemId);
        return {
          name: p?.name || '—',
          quantity: t._sum.quantity || 0,
          revenue: t._sum.total || 0,
        };
      }),
    };
  }

  private async getGenericStats(orgId: string) {
    const [users, customers, sales] = await Promise.all([
      this.prisma.user.count({ where: { organizationId: orgId } }),
      this.prisma.partner.count({ where: { organizationId: orgId, type: 'CUSTOMER' } }),
      this.prisma.sale.count({ where: { organizationId: orgId } }),
    ]);

    return {
      type: 'GENERIC',
      counts: { users, customers, sales },
    };
  }
}
