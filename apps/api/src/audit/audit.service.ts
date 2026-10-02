import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AuditService {
  constructor(private prisma: PrismaService) {}

  async findAll(query: {
    cursor?: string;
    take?: string;
    userId?: string;
    action?: string;
    entity?: string;
    organizationId?: string;
    from?: string;
    to?: string;
    search?: string;
  }) {
    const take = Math.min(Math.max(1, parseInt(query.take || '50')), 200);
    const where: any = {};

    if (query.userId) where.userId = query.userId;
    if (query.action) where.action = { contains: query.action, mode: 'insensitive' };
    if (query.entity) where.entity = query.entity;
    if (query.organizationId) where.organizationId = query.organizationId;

    if (query.from || query.to) {
      where.createdAt = {};
      if (query.from) where.createdAt.gte = new Date(query.from);
      if (query.to) where.createdAt.lte = new Date(query.to);
    }

    if (query.search) {
      where.OR = [
        { action: { contains: query.search, mode: 'insensitive' } },
        { entity: { contains: query.search, mode: 'insensitive' } },
        { entityId: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const dataQuery: any = {
      where,
      orderBy: { createdAt: 'desc' },
      take: take + 1,
      include: {
        user: { select: { id: true, email: true, name: true, role: true } },
        organization: { select: { id: true, name: true, slug: true } },
      },
    };

    if (query.cursor) {
      try {
        const decoded = Buffer.from(query.cursor, 'base64url').toString('utf8');
        dataQuery.cursor = { id: decoded };
        dataQuery.skip = 1;
      } catch { /* ignore */ }
    }

    const rows = await this.prisma.auditLog.findMany(dataQuery);
    const hasMore = rows.length > take;
    const items = hasMore ? rows.slice(0, take) : rows;
    const nextCursor = hasMore && items.length
      ? Buffer.from(items[items.length - 1].id).toString('base64url')
      : null;

    return { items, nextCursor, hasMore, count: items.length };
  }

  async getStats(days = 7) {
    const since = new Date(Date.now() - days * 86400000);

    const [
      total,
      byAction,
      byEntity,
      byUser,
      recentErrors,
    ] = await Promise.all([
      this.prisma.auditLog.count({ where: { createdAt: { gte: since } } }),

      this.prisma.auditLog.groupBy({
        by: ['action'],
        where: { createdAt: { gte: since } },
        _count: true,
        orderBy: { _count: { action: 'desc' } },
        take: 10,
      }),

      this.prisma.auditLog.groupBy({
        by: ['entity'],
        where: { createdAt: { gte: since }, entity: { not: null } },
        _count: true,
        orderBy: { _count: { entity: 'desc' } },
        take: 10,
      }),

      this.prisma.auditLog.groupBy({
        by: ['userId'],
        where: { createdAt: { gte: since }, userId: { not: null } },
        _count: true,
        orderBy: { _count: { userId: 'desc' } },
        take: 10,
      }),

      this.prisma.auditLog.count({
        where: {
          createdAt: { gte: since },
          OR: [
            { action: { contains: '[ERROR]' } },
            { action: { contains: 'ERROR' } },
          ],
        },
      }),
    ]);

    // Enrichir les users
    const userIds = byUser.map((u) => u.userId).filter(Boolean) as string[];
    const users = userIds.length
      ? await this.prisma.user.findMany({
          where: { id: { in: userIds } },
          select: { id: true, email: true, name: true },
        })
      : [];

    return {
      total,
      errors: recentErrors,
      byAction: byAction.map((a) => ({ action: a.action, count: a._count })),
      byEntity: byEntity.map((e) => ({ entity: e.entity, count: e._count })),
      byUser: byUser.map((u) => {
        const user = users.find((x) => x.id === u.userId);
        return {
          userId: u.userId,
          email: user?.email || 'Inconnu',
          name: user?.name || null,
          count: u._count,
        };
      }),
      days,
    };
  }

  async getEntityTypes() {
    const rows = await this.prisma.auditLog.findMany({
      where: { entity: { not: null } },
      distinct: ['entity'],
      select: { entity: true },
    });
    return rows.map((r) => r.entity).filter(Boolean).sort();
  }
}
