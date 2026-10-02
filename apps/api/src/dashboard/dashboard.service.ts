import { Injectable, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { resolvePrice } from '../modules/pricing.util';

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

    const type = org.type === 'HOTEL' ? 'HOTEL'
      : org.type === 'COMMERCE' ? 'COMMERCE'
      : 'GENERIC';

    // ─── Base commune ───
    const base: any = {
      role: user.role,
      type,
      org: { id: org.id, name: org.name, type: org.type, city: org.city },
      generatedAt: new Date().toISOString(),
    };

    const role = user.role;

    // ─── Données métier existantes selon type d'org ───
    if (type === 'HOTEL') Object.assign(base, await this.getHotelStats(user.organizationId));
    else if (type === 'COMMERCE') Object.assign(base, await this.getCommerceStats(user.organizationId));
    else Object.assign(base, await this.getGenericStats(user.organizationId));

    // ─── Données additionnelles par rôle ───
    if (['RECEPTION', 'MANAGER', 'ADMIN'].includes(role)) {
      Object.assign(base, await this.getReceptionData(user.organizationId));
    }
    if (['MANAGER', 'ADMIN'].includes(role)) {
      Object.assign(base, await this.getManagerData(user.organizationId, type));
    }
    if (['FINANCE', 'ADMIN'].includes(role)) {
      Object.assign(base, await this.getFinanceData(user.organizationId));
    }
    if (['STOCK_MANAGER', 'ADMIN'].includes(role)) {
      Object.assign(base, await this.getStockData(user.organizationId));
    }

    return base;
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
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const [
      totalOrganizations,
      activeOrganizations,
      internalOrganizations,
      trialOrgs,
      suspendedOrgs,
      expiredOrgs,
      totalUsers,
      activeUsers,
      totalModules,
      activeSubsWithModules,
      monthPayments,
      lastMonthPayments,
      pendingPayments,
      allClientOrgs,
      orgsByType,
      orgsByCity,
      recentOrgs,
      recentPayments,
      monthlyRevenue,
    ] = await Promise.all([
      this.prisma.organization.count({ where: { type: { not: 'INTERNE' } } }),
      this.prisma.organization.count({ where: { type: { not: 'INTERNE' }, status: 'ACTIVE' } }),
      this.prisma.organization.count({ where: { type: 'INTERNE' } }),
      this.prisma.organization.count({ where: { type: { not: 'INTERNE' }, status: { notIn: ['SUSPENDED', 'INACTIVE'] } } }),
      this.prisma.organization.count({ where: { type: { not: 'INTERNE' }, status: 'SUSPENDED' } }),
      this.prisma.organization.count({ where: { type: { not: 'INTERNE' }, status: 'INACTIVE' } }),
      this.prisma.user.count(),
      this.prisma.user.count({ where: { isActive: true } }),
      this.prisma.module.count({ where: { status: 'ACTIVE' } }),

      // Toutes les subscriptions actives avec leurs modules (pour calcul MRR)
      this.prisma.subscription.findMany({
        where: {
          status: 'ACTIVE',
          organization: { type: { not: 'INTERNE' } },
        },
        include: {
          activeModules: { include: { module: true } },
          organization: { select: { id: true, type: true, name: true } },
        },
      }),

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

      // Toutes les orgs clients avec leur date de création (pour cohortes + top)
      this.prisma.organization.findMany({
        where: { type: { not: 'INTERNE' } },
        select: {
          id: true, name: true, type: true, city: true, status: true,
          createdAt: true,
          subscriptions: {
            where: { status: 'ACTIVE' },
            select: {
              activeModules: { select: { isActive: true, module: { select: { price: true, pricing: true } } } },
            },
            take: 1,
          },
          _count: { select: { users: true, partners: true } },
        },
      }),

      this.prisma.organization.groupBy({
        by: ['type'],
        where: { type: { not: 'INTERNE' } },
        _count: true,
      }),
      this.prisma.organization.groupBy({
        by: ['city'],
        where: { type: { not: 'INTERNE' }, city: { not: null } },
        _count: true,
        orderBy: { _count: { city: 'desc' } },
        take: 8,
      }),

      this.prisma.organization.findMany({
        where: { type: { not: 'INTERNE' } },
        orderBy: { createdAt: 'desc' },
        take: 5,
        include: {
          _count: { select: { users: true, partners: true } },
          subscriptions: {
            select: { status: true },
            orderBy: { createdAt: 'desc' },
            take: 1,
          },
        },
      }),
      this.prisma.payment.findMany({
        where: { organization: { type: { not: 'INTERNE' } } },
        orderBy: { date: 'desc' },
        take: 5,
        include: { organization: { select: { id: true, name: true, type: true } } },
      }),

      this.getMonthlyRevenue(12),
    ]);

    // ═══ MRR / ARR / ARPU ═══
    const mrr = activeSubsWithModules.reduce((sum, sub) => {
      const orgType = sub.organization?.type;
      const subTotal = (sub.activeModules || [])
        .filter((am) => am.isActive)
        .reduce((s, am) => s + resolvePrice(am.module, orgType), 0);
      return sum + subTotal;
    }, 0);

    const arr = mrr * 12;
    const arpu = activeOrganizations > 0 ? mrr / activeOrganizations : 0;

    // ═══ MRR par org (pour top clients) ═══
    const orgsWithMrr = allClientOrgs.map((org) => {
      const sub = org.subscriptions[0];
      const orgMrr = sub
        ? (sub.activeModules || [])
            .filter((am: any) => am.isActive)
            .reduce((s: number, am: any) => s + resolvePrice(am.module, org.type), 0)
        : 0;
      return {
        id: org.id,
        name: org.name,
        type: org.type,
        city: org.city,
        mrr: orgMrr,
        users: org._count.users,
        partners: org._count.partners,
        createdAt: org.createdAt,
      };
    });

    const topClients = [...orgsWithMrr].sort((a, b) => b.mrr - a.mrr).slice(0, 10);

    // ═══ Churn (approximé : orgs INACTIVE ce mois) ═══
    const churnCount = allClientOrgs.filter((o) => o.status === 'INACTIVE').length;
    const churnRate = totalOrganizations > 0 ? (churnCount / totalOrganizations) * 100 : 0;

    // ═══ Cohortes 6 mois ═══
    const cohortMap: Record<string, { month: string; label: string; total: number; active: number; trial: number; mrr: number }> = {};
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      cohortMap[key] = {
        month: key,
        label: d.toLocaleDateString('fr-FR', { month: 'short', year: '2-digit' }),
        total: 0,
        active: 0,
        trial: 0,
        mrr: 0,
      };
    }

    for (const org of orgsWithMrr) {
      const d = new Date(org.createdAt);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      if (!cohortMap[key]) continue;
      cohortMap[key].total++;
      if (org.mrr > 0) cohortMap[key].active++;
      else cohortMap[key].trial++;
      cohortMap[key].mrr += org.mrr;
    }

    const cohorts = Object.values(cohortMap).sort((a, b) => a.month.localeCompare(b.month));

    // ═══ Croissance revenus ═══
    const currentRevenue = monthPayments._sum.amount || 0;
    const prevRevenue = lastMonthPayments._sum.amount || 0;
    const revenueGrowth = prevRevenue > 0
      ? Math.round(((currentRevenue - prevRevenue) / prevRevenue) * 100)
      : 0;

    // ═══ NRR approximé (MRR actif vs MRR il y a 30j si dispo) ═══
    // Faute de tracking historique, on utilise un placeholder
    const nrr = mrr > 0 ? 100 : 0;

    // ═══ Distribution par type ═══
    const totalClientOrgs = orgsByType.reduce((s, o) => s + o._count, 0);
    const distributionByType = orgsByType.map((o) => ({
      type: o.type || 'AUTRE',
      count: o._count,
      pct: totalClientOrgs > 0 ? Math.round((o._count / totalClientOrgs) * 100) : 0,
    }));

    return {
      type: 'SUPER_ADMIN',
      generatedAt: now.toISOString(),

      // KPI financiers (nouveaux)
      financial: {
        mrr,
        arr,
        arpu: Math.round(arpu),
        churnRate: Math.round(churnRate * 10) / 10,
        nrr,
        currentMonthRevenue: currentRevenue,
        previousMonthRevenue: prevRevenue,
        revenueGrowth,
        paymentsThisMonth: monthPayments._count,
        pendingPayments,
      },

      // Organisations
      organizations: {
        total: totalOrganizations,
        active: activeOrganizations,
        trial: trialOrgs - activeOrganizations,
        suspended: suspendedOrgs,
        expired: expiredOrgs,
        internal: internalOrganizations,
      },

      // Utilisateurs
      users: {
        total: totalUsers,
        active: activeUsers,
      },

      // Modules
      modules: {
        total: totalModules,
      },

      // Cohortes
      cohorts,

      // Top 10 clients
      topClients,

      // Distribution
      distribution: {
        byType: distributionByType,
        byCity: orgsByCity.map((c) => ({
          city: c.city || 'Non renseigné',
          count: c._count,
        })),
      },

      // Revenus mensuels (12 mois)
      monthlyRevenue,

      // Récents
      recentOrgs,
      recentPayments,
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

  // ═══════════════════════════════════════════════════════════════
  //  HELPER — Reception (arrivées / départs / chambres)
  // ═══════════════════════════════════════════════════════════════
  private async getReceptionData(orgId: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const [arrivals, departures, inHouse, pendingResas, roomsAvailable, roomsOccupied, roomsCleaning, recentFolios] = await Promise.all([
      this.prisma.reservation.count({ where: { organizationId: orgId, checkInDate: { gte: today, lt: tomorrow }, status: { in: ['PENDING', 'CONFIRMED', 'DEPOSIT_PAID'] } } }),
      this.prisma.reservation.count({ where: { organizationId: orgId, checkOutDate: { gte: today, lt: tomorrow }, status: 'CHECKED_IN' } }),
      this.prisma.reservation.count({ where: { organizationId: orgId, status: 'CHECKED_IN' } }),
      this.prisma.reservation.count({ where: { organizationId: orgId, status: { in: ['PENDING', 'QUOTED'] } } }),
      this.prisma.room.count({ where: { organizationId: orgId, status: 'AVAILABLE' } }),
      this.prisma.room.count({ where: { organizationId: orgId, status: 'OCCUPIED' } }),
      this.prisma.room.count({ where: { organizationId: orgId, status: 'CLEANING' } }),
      this.prisma.reservation.findMany({
        where: { organizationId: orgId, status: { in: ['CHECKED_IN', 'CHECKED_OUT'] } },
        include: { customer: { select: { name: true, firstName: true, lastName: true } }, room: { select: { number: true } } },
        orderBy: { updatedAt: 'desc' },
        take: 5,
      }),
    ]);

    return {
      reception: {
        arrivals, departures, inHouse, pendingResas,
        rooms: { available: roomsAvailable, occupied: roomsOccupied, cleaning: roomsCleaning },
        recentFolios,
      },
    };
  }

  // ═══════════════════════════════════════════════════════════════
  //  HELPER — Manager (KPIs opérationnels)
  // ═══════════════════════════════════════════════════════════════
  private async getManagerData(orgId: string, type: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    const lastMonthStart = new Date(today.getFullYear(), today.getMonth() - 1, 1);

    const [totalRooms, occupiedRooms, monthRevenue, lastMonthRevenue, criticalStockCount, cashTotal, todayPayments] = await Promise.all([
      type === 'HOTEL' ? this.prisma.room.count({ where: { organizationId: orgId } }) : Promise.resolve(0),
      type === 'HOTEL' ? this.prisma.room.count({ where: { organizationId: orgId, status: 'OCCUPIED' } }) : Promise.resolve(0),
      this.prisma.reservation.aggregate({ where: { organizationId: orgId, createdAt: { gte: monthStart }, status: { not: 'CANCELLED' } }, _sum: { totalAmount: true } }),
      this.prisma.reservation.aggregate({ where: { organizationId: orgId, createdAt: { gte: lastMonthStart, lt: monthStart }, status: { not: 'CANCELLED' } }, _sum: { totalAmount: true } }),
      this.prisma.stockItem.count({ where: { organizationId: orgId, currentStock: { lte: 0 } } }),
      this.prisma.cashRegister.aggregate({ where: { organizationId: orgId }, _sum: { currentBalance: true } }),
      this.prisma.orderPayment.aggregate({ where: { order: { organizationId: orgId }, createdAt: { gte: today } }, _sum: { amount: true } }),
    ]);

    const revenue = monthRevenue._sum.totalAmount || 0;
    const prevRevenue = lastMonthRevenue._sum.totalAmount || 0;
    const growth = prevRevenue > 0 ? Math.round(((revenue - prevRevenue) / prevRevenue) * 100) : 0;

    return {
      manager: {
        revenue: { current: revenue, previous: prevRevenue, growth },
        paymentsToday: todayPayments._sum.amount || 0,
        cashTotal: cashTotal._sum.currentBalance || 0,
        occupancy: type === 'HOTEL' && totalRooms > 0 ? { rate: Math.round((occupiedRooms / totalRooms) * 100), total: totalRooms, occupied: occupiedRooms } : null,
        stock: { criticalCount: criticalStockCount },
      },
    };
  }

  // ═══════════════════════════════════════════════════════════════
  //  HELPER — Finance (encaissements / impayés)
  // ═══════════════════════════════════════════════════════════════
  private async getFinanceData(orgId: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [cashToday, cardToday, mobileToday, pendingInvoices, totalPending, creditsPending, creditsTotal] = await Promise.all([
      this.prisma.orderPayment.aggregate({ where: { order: { organizationId: orgId }, createdAt: { gte: today }, method: 'CASH' }, _sum: { amount: true } }),
      this.prisma.orderPayment.aggregate({ where: { order: { organizationId: orgId }, createdAt: { gte: today }, method: 'CARD' }, _sum: { amount: true } }),
      this.prisma.orderPayment.aggregate({ where: { order: { organizationId: orgId }, createdAt: { gte: today }, method: 'MOBILE' }, _sum: { amount: true } }),
      this.prisma.payment.count({ where: { organizationId: orgId, status: 'PENDING' } }),
      this.prisma.payment.aggregate({ where: { organizationId: orgId, status: 'PENDING' }, _sum: { amount: true } }),
      this.prisma.restaurantOrder.count({ where: { organizationId: orgId, paymentStatus: { in: ['UNPAID', 'PARTIAL'] }, notes: { contains: 'CREDIT' } } }),
      this.prisma.restaurantOrder.aggregate({ where: { organizationId: orgId, paymentStatus: { in: ['UNPAID', 'PARTIAL'] }, notes: { contains: 'CREDIT' } }, _sum: { total: true, paidAmount: true } }),
    ]);

    const cash = cashToday._sum.amount || 0;
    const card = cardToday._sum.amount || 0;
    const mobile = mobileToday._sum.amount || 0;

    return {
      finance: {
        today: { cash, card, mobile, total: cash + card + mobile },
        invoices: { pending: pendingInvoices, pendingAmount: totalPending._sum.amount || 0 },
        credits: { count: creditsPending, owed: (creditsTotal._sum.total || 0) - (creditsTotal._sum.paidAmount || 0) },
      },
    };
  }

  // ═══════════════════════════════════════════════════════════════
  //  HELPER — Stock manager
  // ═══════════════════════════════════════════════════════════════
  private async getStockData(orgId: string) {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000);

    const [items, pendingOrders, movements30d, suppliers] = await Promise.all([
      this.prisma.stockItem.findMany({ where: { organizationId: orgId }, select: { currentStock: true, minStock: true, costPrice: true } }),
      this.prisma.purchaseOrder.count({ where: { organizationId: orgId, status: { in: ['DRAFT', 'SENT', 'PARTIAL'] } } }),
      this.prisma.stockMovement.count({ where: { organizationId: orgId, createdAt: { gte: thirtyDaysAgo } } }),
      this.prisma.partner.count({ where: { organizationId: orgId, type: 'SUPPLIER' } }),
    ]);

    const totalValue = items.reduce((s, i) => s + (i.currentStock * i.costPrice), 0);
    const critical = items.filter((i) => i.currentStock > 0 && i.currentStock <= i.minStock).length;
    const out = items.filter((i) => i.currentStock <= 0).length;

    return { stock: { totalItems: items.length, totalValue, critical, out, pendingOrders, movements30d, suppliers } };
  }
}
