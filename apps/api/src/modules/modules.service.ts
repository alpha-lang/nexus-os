import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ModulesService {
  constructor(private prisma: PrismaService) {}

  resolvePrice(module: any, orgType?: string | null): number {
    if (module?.pricing && typeof module.pricing === 'object') {
      const p = module.pricing as Record<string, number>;
      if (orgType && p[orgType] != null) return Number(p[orgType]) || 0;
      if (p.DEFAULT != null) return Number(p.DEFAULT) || 0;
    }
    return Number(module?.price) || 0;
  }

  private async resolveInternalOrganizationId(user: any): Promise<string> {
    if (user.organizationId) return user.organizationId;

    let internalOrg = await this.prisma.organization.findFirst({
      where: { type: 'INTERNE' },
    });

    if (!internalOrg) {
      internalOrg = await this.prisma.organization.create({
        data: {
          name: 'NEXUS CORP',
          slug: 'nexus-corp',
          type: 'INTERNE',
          status: 'ACTIVE',
        },
      });
      await this.prisma.storageQuota.create({
        data: {
          organizationId: internalOrg.id,
          usedStorage: 0,
          maxStorage: 10000,
        },
      });
    }
    return internalOrg.id;
  }

  async findAll(user: any, type?: string) {
    const isSuperAdmin = user.role === 'SUPER_ADMIN' && user.isOwner;

    // Super admin : voit tous les modules, possibilité de filtrer par type
    if (isSuperAdmin) {
      if (type) {
        return this.prisma.module.findMany({
          where: {
            status: 'ACTIVE',
            OR: [{ types: { contains: type } }, { types: null }],
          },
          orderBy: { name: 'asc' },
        });
      }
      return this.prisma.module.findMany({ orderBy: { name: 'asc' } });
    }

    // Autres utilisateurs : on filtre selon le type de leur organisation
    let orgType = type;
    if (!orgType && user.organizationId) {
      const org = await this.prisma.organization.findUnique({
        where: { id: user.organizationId },
        select: { type: true },
      });
      orgType = org?.type || undefined;
    }

    return this.prisma.module.findMany({
      where: {
        status: 'ACTIVE',
        ...(orgType
          ? { OR: [{ types: { contains: orgType } }, { types: null }] }
          : {}),
      },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: string, user: any) {
    const module = await this.prisma.module.findUnique({ where: { id } });
    if (!module) throw new NotFoundException('Module introuvable');
    return module;
  }

  async create(data: any, user: any) {
    if (!user.isOwner || user.role !== 'SUPER_ADMIN') {
      throw new ForbiddenException('Seul le Super Admin Owner peut créer un module.');
    }

    const organizationId = await this.resolveInternalOrganizationId(user);
    const typesCSV = Array.isArray(data.types) ? data.types.join(',') : (data.types || null);
    const pricing = data.pricing && typeof data.pricing === 'object' ? data.pricing : null;
    const fallbackPrice = pricing?.DEFAULT != null ? Number(pricing.DEFAULT) : (data.price || 0);

    return this.prisma.module.create({
      data: {
        name: data.name,
        types: typesCSV,
        description: data.description || null,
        price: fallbackPrice,
        pricing: pricing as any,
        status: data.status || 'ACTIVE',
        route: data.route || null,
        organizationId,
      },
    });
  }

  async update(id: string, data: any, user: any) {
    await this.findOne(id, user);
    if (!user.isOwner || user.role !== 'SUPER_ADMIN') {
      throw new ForbiddenException('Seul le Super Admin Owner peut modifier un module.');
    }
    const typesCSV = Array.isArray(data.types) ? data.types.join(',') : (data.types ?? undefined);
    const pricing = data.pricing && typeof data.pricing === 'object' ? data.pricing : undefined;
    const fallbackPrice = pricing?.DEFAULT != null ? Number(pricing.DEFAULT) : data.price;

    return this.prisma.module.update({
      where: { id },
      data: {
        name: data.name ?? undefined,
        types: typesCSV,
        description: data.description ?? undefined,
        price: fallbackPrice ?? undefined,
        pricing: pricing as any,
        status: data.status ?? undefined,
        route: data.route ?? undefined,
      },
    });
  }

  async remove(id: string, user: any) {
    if (!user.isOwner || user.role !== 'SUPER_ADMIN') {
      throw new ForbiddenException('Seul le Super Admin Owner peut supprimer un module.');
    }
    await this.findOne(id, user);
    return this.prisma.module.delete({ where: { id } });
  }
}
