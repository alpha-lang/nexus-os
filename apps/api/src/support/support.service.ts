import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { computeSla, slaStatus } from './sla.util';

const STATUS_FLOW = ['OPEN', 'IN_PROGRESS', 'WAITING', 'RESOLVED', 'CLOSED'];

@Injectable()
export class SupportService {
  constructor(private prisma: PrismaService) {}

  private isSuperAdmin(user: any) {
    return user.role === 'SUPER_ADMIN' && user.isOwner;
  }

  private async genReference(): Promise<string> {
    const year = new Date().getFullYear();
    const count = await this.prisma.ticket.count();
    return `TKT-${year}-${String(count + 1).padStart(4, '0')}`;
  }

  /**
   * SUPER_ADMIN : voit tous les tickets
   * Tenant : voit uniquement les siens
   */
  async findAll(user: any, filters: any = {}) {
    const where: any = {};
    if (!this.isSuperAdmin(user)) {
      if (!user.organizationId) throw new ForbiddenException('Organisation requise');
      where.organizationId = user.organizationId;
    } else if (filters.organizationId) {
      where.organizationId = filters.organizationId;
    }

    if (filters.status) where.status = filters.status;
    if (filters.priority) where.priority = filters.priority;
    if (filters.category) where.category = filters.category;

    if (filters.search) {
      where.OR = [
        { reference: { contains: filters.search, mode: 'insensitive' } },
        { title: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    const tickets = await this.prisma.ticket.findMany({
      where,
      include: {
        organization: { select: { id: true, name: true, type: true } },
        createdBy: { select: { id: true, email: true, name: true } },
        assignedTo: { select: { id: true, email: true, name: true } },
        _count: { select: { messages: true } },
      },
      orderBy: [{ status: 'asc' }, { updatedAt: 'desc' }],
      take: 200,
    });

    return tickets.map((t) => ({ ...t, slaStatus: slaStatus(t) }));
  }

  async findOne(user: any, id: string) {
    const ticket = await this.prisma.ticket.findUnique({
      where: { id },
      include: {
        organization: { select: { id: true, name: true, type: true } },
        createdBy: { select: { id: true, email: true, name: true, role: true } },
        assignedTo: { select: { id: true, email: true, name: true } },
        messages: {
          include: {
            author: { select: { id: true, email: true, name: true, role: true } },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
    });
    if (!ticket) throw new NotFoundException('Ticket introuvable');
    if (!this.isSuperAdmin(user) && ticket.organizationId !== user.organizationId) {
      throw new ForbiddenException('Accès refusé');
    }
    return ticket;
  }

  async create(user: any, data: any) {
    if (!user.organizationId && !this.isSuperAdmin(user)) {
      throw new ForbiddenException('Organisation requise');
    }
    const reference = await this.genReference();
    const priority = data.priority || 'NORMAL';
    const sla = computeSla(priority);

    // ─── Auto-assignation : Super Admin avec le moins de tickets ouverts ───
    const assignedToId = await this.autoAssignAdmin();

    return this.prisma.ticket.create({
      data: {
        reference,
        title: data.title,
        description: data.description || null,
        category: data.category || 'OTHER',
        priority,
        status: 'OPEN',
        organizationId: data.organizationId || user.organizationId,
        createdById: user.userId,
        assignedToId,
        tags: Array.isArray(data.tags) ? data.tags : [],
        ...sla,
      },
      include: { organization: true, createdBy: true, assignedTo: true },
    });
  }

  /**
   * Trouve le Super Admin avec le moins de tickets actifs (OPEN + IN_PROGRESS)
   */
  private async autoAssignAdmin(): Promise<string | null> {
    try {
      const admins = await this.prisma.user.findMany({
        where: {
          role: 'SUPER_ADMIN',
          isOwner: true,
          isActive: true,
        },
        select: { id: true },
      });

      if (admins.length === 0) return null;

      // Compter les tickets actifs de chaque admin
      const counts = await Promise.all(
        admins.map(async (a) => {
          const count = await this.prisma.ticket.count({
            where: {
              assignedToId: a.id,
              status: { in: ['OPEN', 'IN_PROGRESS', 'WAITING'] },
            },
          });
          return { id: a.id, count };
        }),
      );

      counts.sort((a, b) => a.count - b.count);
      return counts[0].id;
    } catch {
      return null;
    }
  }

  /**
   * Réassigne un ticket à un autre admin.
   */
  async reassign(user: any, ticketId: string, targetUserId: string | null) {
    if (!this.isSuperAdmin(user)) throw new ForbiddenException('Réservé au Super Admin');
    await this.findOne(user, ticketId);
    return this.prisma.ticket.update({
      where: { id: ticketId },
      data: { assignedToId: targetUserId || null },
      include: { assignedTo: { select: { id: true, email: true, name: true } } },
    });
  }

  /**
   * Stats SLA : taux de respect, délai moyen de réponse/résolution.
   */
  async getSlaStats(user: any) {
    const where: any = {};
    if (!this.isSuperAdmin(user)) {
      if (!user.organizationId) throw new ForbiddenException('Organisation requise');
      where.organizationId = user.organizationId;
    }

    const tickets = await this.prisma.ticket.findMany({
      where,
      select: {
        status: true,
        createdAt: true,
        firstResponseAt: true,
        resolvedAt: true,
        slaResponseDeadline: true,
        slaResolutionDeadline: true,
        slaBreached: true,
      },
    });

    const total = tickets.length;
    if (total === 0) {
      return {
        total: 0,
        slaRespected: 0,
        slaRespectedPct: 0,
        avgResponseMinutes: 0,
        avgResolutionHours: 0,
      };
    }

    // SLA respecté : pas breaché OU résolu avant deadline
    let respected = 0;
    let responseDeltas: number[] = [];
    let resolutionDeltas: number[] = [];

    for (const t of tickets) {
      // SLA respect
      const resolved = ['RESOLVED', 'CLOSED'].includes(t.status);
      if (resolved && t.resolvedAt && t.slaResolutionDeadline) {
        if (new Date(t.resolvedAt) <= new Date(t.slaResolutionDeadline)) respected++;
      } else if (!resolved && !t.slaBreached) {
        // Encore actif et pas en retard → compte comme respecté pour l'instant
        respected++;
      }

      // Délai réponse : 1ère réponse - création
      if (t.firstResponseAt) {
        const delta = new Date(t.firstResponseAt).getTime() - new Date(t.createdAt).getTime();
        responseDeltas.push(delta);
      }

      // Délai résolution
      if (resolved && t.resolvedAt) {
        const delta = new Date(t.resolvedAt).getTime() - new Date(t.createdAt).getTime();
        resolutionDeltas.push(delta);
      }
    }

    const avgResponseMs = responseDeltas.length > 0
      ? responseDeltas.reduce((s, d) => s + d, 0) / responseDeltas.length
      : 0;
    const avgResolutionMs = resolutionDeltas.length > 0
      ? resolutionDeltas.reduce((s, d) => s + d, 0) / resolutionDeltas.length
      : 0;

    return {
      total,
      slaRespected: respected,
      slaRespectedPct: Math.round((respected / total) * 100),
      avgResponseMinutes: Math.round(avgResponseMs / 60000),
      avgResolutionHours: Math.round((avgResolutionMs / 3600000) * 10) / 10,
    };
  }

  async update(user: any, id: string, data: any) {
    const ticket = await this.findOne(user, id);
    if (!this.isSuperAdmin(user)) {
      throw new ForbiddenException('Réservé au Super Admin');
    }

    const updateData: any = {
      status: data.status ?? undefined,
      priority: data.priority ?? undefined,
      category: data.category ?? undefined,
      assignedToId: data.assignedToId !== undefined ? (data.assignedToId || null) : undefined,
      title: data.title ?? undefined,
      description: data.description ?? undefined,
    };

    // Trace les transitions
    if (data.status === 'RESOLVED' && ticket.status !== 'RESOLVED') {
      updateData.resolvedAt = new Date();
      // Marquer SLA breached si on a dépassé la deadline de résolution
      if (ticket.slaResolutionDeadline && new Date() > new Date(ticket.slaResolutionDeadline)) {
        updateData.slaBreached = true;
      }
    }
    if (data.status === 'CLOSED' && ticket.status !== 'CLOSED') {
      updateData.closedAt = new Date();
    }

    return this.prisma.ticket.update({ where: { id }, data: updateData });
  }

  async addMessage(user: any, ticketId: string, data: any) {
    const ticket = await this.findOne(user, ticketId);

    // Un tenant ne peut pas écrire en interne
    const isInternal = this.isSuperAdmin(user) ? !!data.isInternal : false;

    const msg = await this.prisma.ticketMessage.create({
      data: {
        ticketId,
        authorId: user.userId,
        content: data.content,
        isInternal,
      },
      include: { author: { select: { id: true, email: true, name: true, role: true } } },
    });

    // Si c'est la 1ère réponse staff et pas une note interne → marquer firstResponseAt
    if (this.isSuperAdmin(user) && !isInternal && !ticket.firstResponseAt) {
      await this.prisma.ticket.update({
        where: { id: ticketId },
        data: { firstResponseAt: new Date() },
      });
    }

    return msg;
  }

  async remove(user: any, id: string) {
    if (!this.isSuperAdmin(user)) throw new ForbiddenException('Réservé au Super Admin');
    await this.findOne(user, id);
    return this.prisma.ticket.delete({ where: { id } });
  }

  async getStats(user: any) {
    const where: any = {};
    if (!this.isSuperAdmin(user)) {
      if (!user.organizationId) throw new ForbiddenException('Organisation requise');
      where.organizationId = user.organizationId;
    }

    const [total, open, inProgress, resolved, urgent] = await Promise.all([
      this.prisma.ticket.count({ where }),
      this.prisma.ticket.count({ where: { ...where, status: 'OPEN' } }),
      this.prisma.ticket.count({ where: { ...where, status: 'IN_PROGRESS' } }),
      this.prisma.ticket.count({ where: { ...where, status: { in: ['RESOLVED', 'CLOSED'] } } }),
      this.prisma.ticket.count({ where: { ...where, priority: 'URGENT', status: { notIn: ['RESOLVED', 'CLOSED'] } } }),
    ]);

    return { total, open, inProgress, resolved, urgent };
  }
}
