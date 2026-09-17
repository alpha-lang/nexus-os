import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { UpdateOrganizationDto } from './dto/update-organization.dto';

@Injectable()
export class OrganizationsService {
  constructor(private prisma: PrismaService) {}

  /**
   * Seul le SUPER_ADMIN owner peut créer/modifier/supprimer des organisations.
   * Les ADMIN d'org peuvent uniquement consulter.
   */
  private assertCanManage(user: any) {
    if (!user || user.role !== 'SUPER_ADMIN' || !user.isOwner) {
      throw new ForbiddenException(
        'Seul le SUPER_ADMIN propriétaire peut gérer les organisations',
      );
    }
  }

  async create(dto: CreateOrganizationDto, user: any) {
    this.assertCanManage(user);

    const existing = await this.prisma.organization.findUnique({
      where: { slug: dto.slug },
    });
    if (existing) throw new BadRequestException('Cette organisation existe déjà');

    const organization = await this.prisma.organization.create({
      data: {
        name: dto.name,
        slug: dto.slug,
        type: dto.type ?? null,
        city: dto.city ?? null,
        email: dto.email ?? null,
        phone: dto.phone ?? null,
        description: dto.description ?? null,
        status: dto.status ?? 'ACTIVE',
      },
    });

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

  async update(id: string, dto: UpdateOrganizationDto, user: any) {
    this.assertCanManage(user);

    const org = await this.prisma.organization.findUnique({ where: { id } });
    if (!org) throw new NotFoundException('Organisation introuvable');

    // Si on change le slug, vérifier l'unicité
    if (dto.slug && dto.slug !== org.slug) {
      const dup = await this.prisma.organization.findUnique({
        where: { slug: dto.slug },
      });
      if (dup) throw new BadRequestException('Ce slug est déjà utilisé');
    }

    return this.prisma.organization.update({
      where: { id },
      data: {
        name: dto.name ?? undefined,
        slug: dto.slug ?? undefined,
        type: dto.type ?? undefined,
        city: dto.city ?? undefined,
        email: dto.email ?? undefined,
        phone: dto.phone ?? undefined,
        description: dto.description ?? undefined,
        status: dto.status ?? undefined,
      },
    });
  }

  async remove(id: string, user: any) {
    this.assertCanManage(user);

    const org = await this.prisma.organization.findUnique({ where: { id } });
    if (!org) throw new NotFoundException('Organisation introuvable');
    if (org.type === 'INTERNE') {
      throw new ForbiddenException(
        'Impossible de supprimer l\'organisation interne (NEXUS CORP)',
      );
    }
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
