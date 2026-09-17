import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CashService {
  constructor(private prisma: PrismaService) {}

  private async getOrganizationId(user: any): Promise<string> {
    if (user.organizationId) return user.organizationId;
    throw new ForbiddenException("Reserve aux utilisateurs d'une organisation.");
  }

  private canWrite(user: any): boolean {
    return (user.role === 'SUPER_ADMIN' && user.isOwner) ||
      ['ADMIN', 'MANAGER', 'FINANCE', 'RECEPTION', 'COMMERCIAL'].includes(user.role);
  }

  async findAllRegisters(user: any) {
    const orgId = await this.getOrganizationId(user);
    return this.prisma.cashRegister.findMany({
      where: { organizationId: orgId },
      include: { _count: { select: { movements: true } } },
      orderBy: [{ status: 'asc' }, { name: 'asc' }],
    });
  }

  async createRegister(user: any, data: any) {
    if (!this.canWrite(user)) throw new ForbiddenException('Acces refuse');
    const orgId = await this.getOrganizationId(user);
    const existing = await this.prisma.cashRegister.findFirst({
      where: { organizationId: orgId, name: data.name },
    });
    if (existing) throw new BadRequestException('Cette caisse existe deja');

    return this.prisma.cashRegister.create({
      data: {
        name: data.name,
        type: data.type || 'CAISSE',
        location: data.location || null,
        currentBalance: parseFloat(data.initialBalance) || 0,
        organizationId: orgId,
      },
    });
  }

  async updateRegister(user: any, id: string, data: any) {
    if (!this.canWrite(user)) throw new ForbiddenException('Acces refuse');
    const reg = await this.prisma.cashRegister.findUnique({ where: { id } });
    if (!reg) throw new NotFoundException('Caisse introuvable');
    if (reg.status === 'CLOSED') {
      throw new BadRequestException(
        'Caisse fermee : impossible de la modifier. Rouvrez-la d abord.',
      );
    }
    return this.prisma.cashRegister.update({
      where: { id },
      data: {
        name: data.name ?? undefined,
        type: data.type ?? undefined,
        location: data.location ?? undefined,
      },
    });
  }

  async removeRegister(user: any, id: string) {
    if (!this.canWrite(user)) throw new ForbiddenException('Acces refuse');
    const reg = await this.prisma.cashRegister.findUnique({
      where: { id },
      include: { _count: { select: { movements: true, sessions: true } } },
    });
    if (!reg) throw new NotFoundException('Caisse introuvable');
    if (reg.status === 'CLOSED' && (reg._count.movements > 0 || reg._count.sessions > 0)) {
      throw new BadRequestException(
        'Caisse fermee avec historique : suppression verrouillee. Contactez un administrateur.',
      );
    }
    return this.prisma.cashRegister.delete({ where: { id } });
  }

  async findAllMovements(user: any, filters?: any) {
    const orgId = await this.getOrganizationId(user);
    const where: any = { organizationId: orgId };
    if (filters?.registerId) where.registerId = filters.registerId;
    if (filters?.type) where.type = filters.type;

    return this.prisma.cashMovement.findMany({
      where,
      include: {
        register: { select: { id: true, name: true, type: true, status: true } },
        user: { select: { id: true, name: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
  }

  async createMovement(user: any, data: any) {
    if (!this.canWrite(user)) throw new ForbiddenException('Acces refuse');
    const orgId = await this.getOrganizationId(user);

    const register = await this.prisma.cashRegister.findFirst({
      where: { id: data.registerId, organizationId: orgId },
    });
    if (!register) throw new NotFoundException('Caisse introuvable');

    if (register.status !== 'OPEN') {
      throw new BadRequestException(
        'Caisse fermee : impossible d enregistrer un mouvement. Ouvrez la caisse d abord.',
      );
    }

    // Recupere la session OUVERTE (closedAt === null)
    const session = await this.prisma.cashSession.findFirst({
      where: { registerId: data.registerId, closedAt: null },
      orderBy: { openedAt: 'desc' },
    });
    if (!session) {
      throw new BadRequestException(
        'Aucune session ouverte sur cette caisse. Ouvrez une session avant de saisir un mouvement.',
      );
    }

    const amount = parseFloat(data.amount) || 0;
    if (amount <= 0) throw new BadRequestException('Montant invalide');

    const type = data.type || 'IN';
    const isOut = ['OUT', 'EXPENSE', 'WITHDRAWAL', 'TRANSFER_OUT'].includes(type);

    if (isOut && register.currentBalance < amount) {
      throw new BadRequestException('Solde insuffisant dans cette caisse');
    }

    const newBalance = isOut ? register.currentBalance - amount : register.currentBalance + amount;

    return this.prisma.$transaction(async (tx) => {
      const movement = await tx.cashMovement.create({
        data: {
          registerId: data.registerId,
          sessionId: session.id,
          type,
          amount,
          reason: data.reason || null,
          reference: data.reference || null,
          userId: user.userId || user.id,
          organizationId: orgId,
        },
        include: {
          register: { select: { id: true, name: true } },
          user: { select: { id: true, name: true, email: true } },
        },
      });

      await tx.cashRegister.update({
        where: { id: data.registerId },
        data: { currentBalance: newBalance },
      });

      return movement;
    });
  }

  async removeMovement(user: any, id: string) {
    if (!this.canWrite(user)) throw new ForbiddenException('Acces refuse');
    const movement = await this.prisma.cashMovement.findUnique({ where: { id } });
    if (!movement) throw new NotFoundException('Mouvement introuvable');

    const isOut = ['OUT', 'EXPENSE', 'WITHDRAWAL', 'TRANSFER_OUT'].includes(movement.type);
    const register = await this.prisma.cashRegister.findUnique({ where: { id: movement.registerId } });
    if (!register) throw new NotFoundException('Caisse introuvable');

    if (register.status === 'CLOSED') {
      throw new BadRequestException(
        'Caisse fermee : impossible de supprimer un mouvement. Ouvrez la caisse ou annulez la fermeture avant.',
      );
    }

    const newBalance = isOut
      ? register.currentBalance + movement.amount
      : register.currentBalance - movement.amount;

    return this.prisma.$transaction(async (tx) => {
      await tx.cashRegister.update({
        where: { id: movement.registerId },
        data: { currentBalance: newBalance },
      });
      return tx.cashMovement.delete({ where: { id } });
    });
  }

  async openRegister(user: any, registerId: string, data: any) {
    if (!this.canWrite(user)) throw new ForbiddenException('Acces refuse');
    const orgId = await this.getOrganizationId(user);

    const register = await this.prisma.cashRegister.findFirst({
      where: { id: registerId, organizationId: orgId },
    });
    if (!register) throw new NotFoundException('Caisse introuvable');
    if (register.status === 'OPEN') throw new BadRequestException('Cette caisse est deja ouverte');

    const openingAmount = parseFloat(data.openingAmount) || 0;

    return this.prisma.$transaction(async (tx) => {
      const session = await tx.cashSession.create({
        data: {
          registerId,
          openingAmount,
          openingBreakdown: data.openingBreakdown || null,
          userId: user.userId || user.id,
          organizationId: orgId,
          notes: data.notes || null,
        },
      });

      await tx.cashRegister.update({
        where: { id: registerId },
        data: {
          status: 'OPEN',
          openedAt: new Date(),
          closedAt: null,
          currentBalance: openingAmount,
        },
      });

      // Trace l'apport initial comme mouvement IN (visible dans le journal)
      if (openingAmount > 0) {
        await tx.cashMovement.create({
          data: {
            registerId,
            sessionId: session.id,
            type: 'IN',
            amount: openingAmount,
            reason: 'Fond de caisse ouverture',
            reference: 'OPEN-' + session.id.slice(-6).toUpperCase(),
            userId: user.userId || user.id,
            organizationId: orgId,
          },
        });
      }

      return session;
    });
  }

  async closeRegister(user: any, registerId: string, data: any) {
    if (!this.canWrite(user)) throw new ForbiddenException('Acces refuse');
    const orgId = await this.getOrganizationId(user);

    const register = await this.prisma.cashRegister.findFirst({
      where: { id: registerId, organizationId: orgId },
    });
    if (!register) throw new NotFoundException('Caisse introuvable');
    if (register.status !== 'OPEN') throw new BadRequestException('Cette caisse est deja fermee');

    // Verifie qu'une session ouverte existe
    const openSessionCheck = await this.prisma.cashSession.findFirst({
      where: { registerId, closedAt: null },
    });
    if (!openSessionCheck) {
      throw new BadRequestException(
        'Aucune session ouverte : impossible de fermer. Ouvrez une session avant.',
      );
    }

    const closingAmount = parseFloat(data.closingAmount) || 0;
    const theoreticalAmount = register.currentBalance;
    const difference = closingAmount - theoreticalAmount;

    const openSession = await this.prisma.cashSession.findFirst({
      where: { registerId, closedAt: null },
      orderBy: { openedAt: 'desc' },
    });

    return this.prisma.$transaction(async (tx) => {
      if (openSession) {
        await tx.cashSession.update({
          where: { id: openSession.id },
          data: {
            closedAt: new Date(),
            closingAmount,
            theoreticalAmount,
            difference,
            closingBreakdown: data.closingBreakdown || null,
            notes: data.notes || openSession.notes,
          },
        });
      }

      await tx.cashRegister.update({
        where: { id: registerId },
        data: {
          status: 'CLOSED',
          closedAt: new Date(),
          currentBalance: closingAmount,
        },
      });

      return { difference, theoreticalAmount, closingAmount };
    });
  }

  async findAllSessions(user: any, registerId?: string) {
    const orgId = await this.getOrganizationId(user);
    const where: any = { organizationId: orgId };
    if (registerId) where.registerId = registerId;

    return this.prisma.cashSession.findMany({
      where,
      include: {
        register: { select: { id: true, name: true } },
        user: { select: { id: true, name: true, email: true } },
        _count: { select: { movements: true, orderPayments: true } },
      },
      orderBy: { openedAt: 'desc' },
      take: 100,
    });
  }

  /**
   * Vue d'ensemble du module Caisse : KPIs, activité, alertes.
   */
  async getOverview(user: any) {
    const orgId = await this.getOrganizationId(user);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000);

    // ═══ CAISSES ═══
    const registers = await this.prisma.cashRegister.findMany({
      where: { organizationId: orgId },
      include: { _count: { select: { sessions: true, movements: true } } },
    });

    const totalBalance = registers.reduce((s, r) => s + r.currentBalance, 0);
    const openRegisters = registers.filter((r) => r.status === 'OPEN').length;

    // ═══ SESSIONS OUVERTES ═══
    const openSessions = await this.prisma.cashSession.findMany({
      where: { organizationId: orgId, closedAt: null },
      include: {
        register: { select: { id: true, name: true, type: true } },
        user: { select: { id: true, name: true, email: true } },
        _count: { select: { movements: true, orderPayments: true } },
      },
      orderBy: { openedAt: 'desc' },
    });

    const activeSessions = await Promise.all(
      openSessions.map(async (s) => {
        const movements = await this.prisma.cashMovement.aggregate({
          where: { sessionId: s.id },
          _sum: { amount: true },
        });
        const movementsIn = await this.prisma.cashMovement.aggregate({
          where: { sessionId: s.id, type: { in: ['SALE', 'IN', 'DEPOSIT', 'TRANSFER_IN'] } },
          _sum: { amount: true },
        });
        const movementsOut = await this.prisma.cashMovement.aggregate({
          where: { sessionId: s.id, type: { in: ['EXPENSE', 'OUT', 'WITHDRAWAL', 'TRANSFER_OUT'] } },
          _sum: { amount: true },
        });
        return {
          id: s.id,
          register: s.register,
          user: s.user,
          openedAt: s.openedAt,
          openingAmount: s.openingAmount,
          movementsCount: s._count.movements,
          paymentsCount: s._count.orderPayments,
          inAmount: movementsIn._sum.amount || 0,
          outAmount: movementsOut._sum.amount || 0,
          currentBalance: s.openingAmount + (movementsIn._sum.amount || 0) - (movementsOut._sum.amount || 0),
        };
      }),
    );

    // ═══ MOUVEMENTS DU JOUR ═══
    const todayMovements = await this.prisma.cashMovement.findMany({
      where: { organizationId: orgId, createdAt: { gte: today } },
      include: {
        register: { select: { id: true, name: true } },
        user: { select: { id: true, name: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const todayIn = todayMovements
      .filter((m) => ['SALE', 'IN', 'DEPOSIT', 'TRANSFER_IN'].includes(m.type))
      .reduce((s, m) => s + m.amount, 0);
    const todayOut = todayMovements
      .filter((m) => ['EXPENSE', 'OUT', 'WITHDRAWAL', 'TRANSFER_OUT'].includes(m.type))
      .reduce((s, m) => s + m.amount, 0);

    const todayByType: Record<string, number> = {};
    todayMovements.forEach((m) => {
      todayByType[m.type] = (todayByType[m.type] || 0) + m.amount;
    });

    // ═══ VENTES POS DU JOUR ═══
    const posSalesToday = await this.prisma.orderPayment.aggregate({
      where: {
        order: { organizationId: orgId },
        createdAt: { gte: today },
      },
      _sum: { amount: true },
      _count: true,
    });

    const posSalesByMethod = await this.prisma.orderPayment.groupBy({
      by: ['method'],
      where: {
        order: { organizationId: orgId },
        createdAt: { gte: today },
      },
      _sum: { amount: true },
      _count: true,
    });

    // ═══ CRÉDITS EN COURS ═══
    const credits = await this.prisma.restaurantOrder.findMany({
      where: {
        organizationId: orgId,
        paymentStatus: { in: ['UNPAID', 'PARTIAL'] },
        status: { notIn: ['CANCELLED'] },
        notes: { contains: 'CREDIT' },
      },
      select: { total: true, paidAmount: true },
    });

    const creditsTotal = credits.reduce((s, c) => s + c.total, 0);
    const creditsPaid = credits.reduce((s, c) => s + c.paidAmount, 0);
    const creditsRemaining = creditsTotal - creditsPaid;

    // ═══ FOLIOS AVEC SOLDE ═══
    const foliosWithBalance = await this.prisma.reservation.findMany({
      where: {
        organizationId: orgId,
        status: 'CHECKED_IN',
      },
      include: {
        customer: { select: { id: true, name: true } },
        room: { select: { number: true } },
      },
    });

    const foliosWithDebt = foliosWithBalance.filter((r) => r.totalAmount - r.paidAmount > 0);

    // ═══ ACTIVITÉ RÉCENTE ═══
    const recentMovements = todayMovements.slice(0, 5);
    const recentPayments = await this.prisma.orderPayment.findMany({
      where: { order: { organizationId: orgId } },
      include: {
        order: { select: { id: true, table: { select: { number: true } } } },
        cashSession: { select: { id: true, register: { select: { name: true } } } },
      },
      orderBy: { createdAt: 'desc' },
      take: 5,
    });

    // ═══ ALERTES ═══
    const alerts: { type: string; label: string; count: number; href: string }[] = [];
    if (registers.length === 0) {
      alerts.push({ type: 'no_register', label: 'Aucune caisse créée', count: 0, href: '/dashboard/caisse/journal' });
    }
    if (registers.length > 0 && openRegisters === 0) {
      alerts.push({ type: 'no_open', label: 'Aucune caisse ouverte', count: registers.length, href: '/dashboard/caisse/journal' });
    }
    if (creditsRemaining > 0) {
      alerts.push({ type: 'credits', label: 'Crédits à recouvrer', count: credits.length, href: '/dashboard/caisse/credits' });
    }
    if (foliosWithDebt.length > 0) {
      alerts.push({ type: 'folios', label: 'Folios clients à encaisser', count: foliosWithDebt.length, href: '/dashboard/caisse/folios' });
    }

    return {
      kpis: {
        totalRegisters: registers.length,
        openRegisters,
        totalBalance,
        todayIn,
        todayOut,
        todayNet: todayIn - todayOut,
        todayMovementsCount: todayMovements.length,
      },
      pos: {
        salesToday: posSalesToday._sum.amount || 0,
        ordersToday: posSalesToday._count || 0,
        byMethod: posSalesByMethod.map((m) => ({
          method: m.method,
          amount: m._sum.amount || 0,
          count: m._count,
        })),
      },
      credits: {
        total: creditsTotal,
        paid: creditsPaid,
        remaining: creditsRemaining,
        count: credits.length,
      },
      folios: {
        withDebt: foliosWithDebt.length,
        totalDue: foliosWithDebt.reduce((s, r) => s + (r.totalAmount - r.paidAmount), 0),
      },
      activeSessions,
      recentMovements,
      recentPayments,
      alerts,
    };
  }

  async getGlobalStats(user: any) {
    const orgId = await this.getOrganizationId(user);

    const registers = await this.prisma.cashRegister.findMany({
      where: { organizationId: orgId },
    });

    const totalBalance = registers.reduce((s, r) => s + r.currentBalance, 0);
    const openCount = registers.filter((r) => r.status === 'OPEN').length;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todayIn = await this.prisma.cashMovement.aggregate({
      where: {
        organizationId: orgId,
        createdAt: { gte: today },
        type: { in: ['SALE', 'DEPOSIT', 'IN', 'TRANSFER_IN'] },
      },
      _sum: { amount: true },
    });

    const todayOut = await this.prisma.cashMovement.aggregate({
      where: {
        organizationId: orgId,
        createdAt: { gte: today },
        type: { in: ['EXPENSE', 'OUT', 'WITHDRAWAL', 'TRANSFER_OUT'] },
      },
      _sum: { amount: true },
    });

    const inAmt = todayIn._sum.amount || 0;
    const outAmt = todayOut._sum.amount || 0;

    return {
      totalRegisters: registers.length,
      openRegisters: openCount,
      totalBalance,
      todayIn: inAmt,
      todayOut: outAmt,
      todayNet: inAmt - outAmt,
    };
  }
}
