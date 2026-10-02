import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateModuleDto } from './dto/create-module.dto';
import { UpdateModuleDto } from './dto/update-module.dto';

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

    // ─── Super Admin : voit tous les modules + stats ───
    if (isSuperAdmin) {
      const where: any = {};
      if (type) {
        where.OR = [{ types: { contains: type } }, { types: null }];
      }

      const modules = await this.prisma.module.findMany({
        where,
        orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
        include: {
          subscriptionModules: {
            where: { isActive: true, subscription: { status: 'ACTIVE' } },
            select: {
              id: true,
              subscription: {
                select: {
                  organizationId: true,
                  organization: { select: { type: true } },
                },
              },
            },
          },
        },
      });

      // Enrichir avec stats
      return modules.map((m) => {
        const activeModules = m.subscriptionModules || [];
        const subscriberCount = new Set(
          activeModules.map((am) => am.subscription?.organizationId).filter(Boolean),
        ).size;

        // MRR généré : somme des prix réellement facturés par tenant (via pricing)
        const mrrGenerated = activeModules.reduce((sum, am) => {
          const orgType = am.subscription?.organization?.type;
          return sum + this.resolvePrice(m, orgType);
        }, 0);

        const ageInDays = Math.floor(
          (Date.now() - new Date(m.createdAt).getTime()) / 86400000,
        );

        return {
          id: m.id,
          name: m.name,
          types: m.types,
          description: m.description,
          price: m.price,
          pricing: m.pricing,
          status: m.status,
          route: m.route,
          sortOrder: m.sortOrder,
          organizationId: m.organizationId,
          createdAt: m.createdAt,
          updatedAt: m.updatedAt,
          // Stats
          subscriberCount,
          mrrGenerated,
          ageInDays,
        };
      });
    }

    // ─── Tenant : filtre par type d'org ───
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
          ? { OR: [
              { types: { contains: orgType } },
              { types: null },
              { types: '' },
            ] }
          : {}),
      },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });
  }

  /**
   * Réordonne les modules en masse (drag&drop).
   * Body : [{ id, sortOrder }, ...]
   */
  async reorder(user: any, items: { id: string; sortOrder: number }[]) {
    if (!user.isOwner || user.role !== 'SUPER_ADMIN') {
      throw new ForbiddenException('Seul le Super Admin Owner peut réordonner.');
    }

    // Transaction : update en masse
    await this.prisma.$transaction(
      items.map((it) =>
        this.prisma.module.update({
          where: { id: it.id },
          data: { sortOrder: it.sortOrder },
        }),
      ),
    );

    return { success: true, count: items.length };
  }

  async findOne(id: string, user: any) {
    const module = await this.prisma.module.findUnique({ where: { id } });
    if (!module) throw new NotFoundException('Module introuvable');
    return module;
  }

  async create(data: CreateModuleDto, user: any) {
    if (!user.isOwner || user.role !== 'SUPER_ADMIN') {
      throw new ForbiddenException('Seul le Super Admin Owner peut créer un module.');
    }

    const organizationId = await this.resolveInternalOrganizationId(user);
    const typesCSV = Array.isArray(data.types)
      ? (data.types.length > 0 ? data.types.join(',') : null)
      : (data.types || null);
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

  async update(id: string, data: UpdateModuleDto, user: any) {
    await this.findOne(id, user);
    if (!user.isOwner || user.role !== 'SUPER_ADMIN') {
      throw new ForbiddenException('Seul le Super Admin Owner peut modifier un module.');
    }
    const typesCSV = Array.isArray(data.types)
      ? (data.types.length > 0 ? data.types.join(',') : null)
      : (data.types ?? undefined);
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
