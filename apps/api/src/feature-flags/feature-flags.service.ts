import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class FeatureFlagsService {
  constructor(private prisma: PrismaService) {}

  private assertSuperAdmin(user: any) {
    if (!(user.role === 'SUPER_ADMIN' && user.isOwner)) {
      throw new ForbiddenException('Réservé au Super Admin');
    }
  }

  async findAll(user: any) {
    this.assertSuperAdmin(user);
    return this.prisma.featureFlag.findMany({
      include: {
        overrides: {
          include: { organization: { select: { id: true, name: true, type: true } } },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(user: any, data: any) {
    this.assertSuperAdmin(user);
    return this.prisma.featureFlag.create({
      data: {
        key: data.key.trim().toLowerCase().replace(/\s+/g, '_'),
        label: data.label,
        description: data.description || null,
        defaultEnabled: !!data.defaultEnabled,
        isActive: data.isActive !== false,
      },
    });
  }

  async update(user: any, id: string, data: any) {
    this.assertSuperAdmin(user);
    const exists = await this.prisma.featureFlag.findUnique({ where: { id } });
    if (!exists) throw new NotFoundException('Flag introuvable');
    return this.prisma.featureFlag.update({
      where: { id },
      data: {
        label: data.label ?? undefined,
        description: data.description ?? undefined,
        defaultEnabled: data.defaultEnabled ?? undefined,
        isActive: data.isActive ?? undefined,
      },
    });
  }

  async remove(user: any, id: string) {
    this.assertSuperAdmin(user);
    return this.prisma.featureFlag.delete({ where: { id } });
  }

  async setOverride(user: any, flagId: string, organizationId: string, enabled: boolean) {
    this.assertSuperAdmin(user);
    return this.prisma.featureFlagOverride.upsert({
      where: { flagId_organizationId: { flagId, organizationId } },
      update: { enabled },
      create: { flagId, organizationId, enabled },
    });
  }

  async removeOverride(user: any, flagId: string, organizationId: string) {
    this.assertSuperAdmin(user);
    await this.prisma.featureFlagOverride.deleteMany({ where: { flagId, organizationId } });
    return { success: true };
  }

  /**
   * Route publique : retourne la map { key: bool } résolue pour l'org de l'user.
   */
  async getMyFlags(user: any) {
    const flags = await this.prisma.featureFlag.findMany({
      where: { isActive: true },
      include: {
        overrides: user.organizationId
          ? { where: { organizationId: user.organizationId } }
          : false,
      },
    });

    const result: Record<string, boolean> = {};
    for (const f of flags) {
      const override = (f as any).overrides?.[0];
      result[f.key] = override ? override.enabled : f.defaultEnabled;
    }
    return result;
  }
}
