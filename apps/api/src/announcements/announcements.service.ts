import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AnnouncementsService {
  constructor(private prisma: PrismaService) {}

  private assertSuperAdmin(user: any) {
    if (!(user.role === 'SUPER_ADMIN' && user.isOwner)) {
      throw new ForbiddenException('Réservé au Super Admin');
    }
  }

  async findAll(user: any) {
    this.assertSuperAdmin(user);
    return this.prisma.announcement.findMany({
      include: { createdBy: { select: { id: true, email: true, name: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(user: any, data: any) {
    this.assertSuperAdmin(user);
    return this.prisma.announcement.create({
      data: {
        title: data.title,
        message: data.message,
        type: data.type || 'INFO',
        target: data.target || 'ALL',
        targetTypes: data.targetTypes || null,
        targetOrgIds: data.targetOrgIds || null,
        startsAt: data.startsAt ? new Date(data.startsAt) : new Date(),
        endsAt: data.endsAt ? new Date(data.endsAt) : null,
        isDismissible: data.isDismissible !== false,
        isActive: data.isActive !== false,
        createdById: user.userId,
      },
    });
  }

  async update(user: any, id: string, data: any) {
    this.assertSuperAdmin(user);
    const exists = await this.prisma.announcement.findUnique({ where: { id } });
    if (!exists) throw new NotFoundException('Annonce introuvable');
    return this.prisma.announcement.update({
      where: { id },
      data: {
        title: data.title ?? undefined,
        message: data.message ?? undefined,
        type: data.type ?? undefined,
        target: data.target ?? undefined,
        targetTypes: data.targetTypes ?? undefined,
        targetOrgIds: data.targetOrgIds ?? undefined,
        startsAt: data.startsAt ? new Date(data.startsAt) : undefined,
        endsAt: data.endsAt !== undefined ? (data.endsAt ? new Date(data.endsAt) : null) : undefined,
        isDismissible: data.isDismissible ?? undefined,
        isActive: data.isActive ?? undefined,
      },
    });
  }

  async remove(user: any, id: string) {
    this.assertSuperAdmin(user);
    return this.prisma.announcement.delete({ where: { id } });
  }

  async getActive(user: any) {
    const now = new Date();
    const orgType = user.organizationId
      ? (await this.prisma.organization.findUnique({
          where: { id: user.organizationId },
          select: { type: true },
        }))?.type
      : null;

    const all = await this.prisma.announcement.findMany({
      where: {
        isActive: true,
        startsAt: { lte: now },
        OR: [{ endsAt: null }, { endsAt: { gte: now } }],
      },
      orderBy: { startsAt: 'desc' },
    });

    if (user.role === 'SUPER_ADMIN') return all;

    return all.filter((a) => {
      if (a.target === 'ALL') return true;
      if (a.target === 'ORG_TYPE') {
        const types = (a.targetTypes || '').split(',').map((t) => t.trim());
        return orgType && types.includes(orgType);
      }
      if (a.target === 'SPECIFIC_ORGS') {
        const ids = (a.targetOrgIds || '').split(',').map((t) => t.trim());
        return user.organizationId && ids.includes(user.organizationId);
      }
      return false;
    });
  }
}
