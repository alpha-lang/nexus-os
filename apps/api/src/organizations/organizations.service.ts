import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

@Injectable()
export class OrganizationsService {
  constructor(private prisma: PrismaService) {}

  async create(data: any) {
    const existing = await this.prisma.organization.findUnique({
      where: { slug: data.slug },
    });
    if (existing) throw new BadRequestException('Cette organisation existe déjà');

    const organization = await this.prisma.organization.create({
      data: {
        name: data.name,
        slug: data.slug,
        type: data.type || null,
        city: data.city || null,
        email: data.email || null,
        phone: data.phone || null,
        description: data.description || null,
        status: data.status || 'ACTIVE',
      },
    });

    // On crée uniquement le quota de stockage par défaut.
    // Pas d'utilisateur, pas d'abonnement : à créer explicitement
    // depuis /dashboard/users ou /dashboard/tenant-admins et
    // /dashboard/subscriptions.
    await this.prisma.storageQuota.create({
      data: {
        organizationId: organization.id,
        usedStorage: 0,
        maxStorage: 500,
      },
    });

    return this.prisma.organization.findUnique({
      where: { id: organization.id },
      include: {
        subscriptions: { include: { activeModules: { include: { module: true } } } },
        storageQuota: true,
        users: true,
      },
    });
  }

  async findAll() {
    return this.prisma.organization.findMany({
      include: {
        subscriptions: { include: { activeModules: { include: { module: true } } } },
        storageQuota: true,
        _count: { select: { users: true, partners: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const org = await this.prisma.organization.findUnique({
      where: { id },
      include: {
        subscriptions: { include: { activeModules: { include: { module: true } } } },
        storageQuota: true,
        users: true,
      },
    });
    if (!org) throw new NotFoundException('Organisation introuvable');
    return org;
  }

  async update(id: string, data: any) {
    const org = await this.prisma.organization.findUnique({ where: { id } });
    if (!org) throw new NotFoundException('Organisation introuvable');
    return this.prisma.organization.update({
      where: { id },
      data: {
        name: data.name ?? undefined,
        slug: data.slug ?? undefined,
        type: data.type ?? undefined,
        city: data.city ?? undefined,
        email: data.email ?? undefined,
        phone: data.phone ?? undefined,
        description: data.description ?? undefined,
        status: data.status ?? undefined,
      },
    });
  }

  async remove(id: string) {
    const org = await this.prisma.organization.findUnique({ where: { id } });
    if (!org) throw new NotFoundException('Organisation introuvable');
    return this.prisma.organization.delete({ where: { id } });
  }

  async findClientOrganizations() {
    return this.prisma.organization.findMany({
      where: { type: { not: 'INTERNE' } },
      include: {
        subscriptions: { include: { activeModules: { include: { module: true } } } },
        storageQuota: true,
      },
      orderBy: { name: 'asc' },
    });
  }
}
