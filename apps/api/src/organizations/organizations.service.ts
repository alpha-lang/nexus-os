import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcryptjs';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { UpdateOrganizationDto } from './dto/update-organization.dto';

// Select safe : ne JAMAIS exposer le hash password
const SAFE_USER_SELECT = {
  id: true,
  email: true,
  name: true,
  role: true,
  isActive: true,
  isOwner: true,
  createdAt: true,
} as const;

@Injectable()
export class OrganizationsService {
  constructor(private prisma: PrismaService) {}

  private assertCanManage(user: any) {
    if (!user || user.role !== 'SUPER_ADMIN' || !user.isOwner) {
      throw new ForbiddenException(
        'Seul le SUPER_ADMIN propriétaire peut gérer les organisations',
      );
    }
  }

  async create(dto: CreateOrganizationDto, user: any) {
    this.assertCanManage(user);

    // ─── 1. Vérifications préalables ───
    const existing = await this.prisma.organization.findUnique({
      where: { slug: dto.slug },
    });
    if (existing) {
      throw new BadRequestException('Cette organisation existe déjà (slug pris)');
    }

    // ─── 2. Préparer l'admin (si fourni) ───
    let hashedPassword: string | null = null;
    let adminEmail: string | null = null;
    if (dto.adminEmail && dto.adminPassword) {
      const existingUser = await this.prisma.user.findFirst({
        where: { email: dto.adminEmail },
      });
      if (existingUser) {
        throw new BadRequestException(
          `Un utilisateur avec l'email ${dto.adminEmail} existe déjà dans une autre organisation`,
        );
      }
      hashedPassword = await bcrypt.hash(dto.adminPassword, 10);
      adminEmail = dto.adminEmail;
    }

    // ─── 3. Transaction complète ───
    return this.prisma.$transaction(async (tx) => {
      // 3a. Créer l'organisation
      const organization = await tx.organization.create({
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

      // 3b. StorageQuota par défaut
      await tx.storageQuota.create({
        data: {
          organizationId: organization.id,
          usedStorage: 0,
          maxStorage: 500,
        },
      });

      // 3c. Admin user (si email + password fournis)
      let adminUser = null;
      if (hashedPassword && adminEmail) {
        adminUser = await tx.user.create({
          data: {
            email: adminEmail,
            password: hashedPassword,
            name: dto.adminName || dto.name,
            role: 'ADMIN',
            isOwner: true,
            isActive: true,
            organizationId: organization.id,
          },
          select: {
            id: true,
            email: true,
            name: true,
            role: true,
            isOwner: true,
            isActive: true,
            createdAt: true,
          },
        });
      }

      // 3d. Subscription (si modules ou statut fournis)
      let subscription = null;
      const shouldCreateSub =
        dto.subscriptionStatus || (dto.moduleIds && dto.moduleIds.length > 0);

      if (shouldCreateSub) {
        subscription = await tx.subscription.create({
          data: {
            organizationId: organization.id,
            status: dto.subscriptionStatus || 'TRIAL',
            billingPeriod: dto.billingPeriod || 'MONTHLY',
            endDate: dto.endDate ? new Date(dto.endDate) : null,
          },
        });

        // 3e. Rattacher les modules
        if (dto.moduleIds && dto.moduleIds.length > 0) {
          // Vérifier que les modules existent
          const validModules = await tx.module.findMany({
            where: { id: { in: dto.moduleIds } },
            select: { id: true },
          });
          const validIds = new Set(validModules.map((m) => m.id));

          for (const moduleId of dto.moduleIds) {
            if (!validIds.has(moduleId)) continue;
            await tx.subscriptionModule.create({
              data: {
                subscriptionId: subscription.id,
                moduleId,
                isActive: true,
              },
            });
          }
        }
      }

      // ─── 4. Retour complet ───
      return tx.organization.findUnique({
        where: { id: organization.id },
        include: {
          subscriptions: {
            include: {
              activeModules: { include: { module: true } },
            },
          },
          storageQuota: true,
          users: { select: SAFE_USER_SELECT },
          _count: { select: { users: true, partners: true } },
        },
      });
    });
  }

  async findAll() {
    return this.prisma.organization.findMany({
      include: {
        subscriptions: {
          include: { activeModules: { include: { module: true } } },
        },
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
        subscriptions: {
          include: { activeModules: { include: { module: true } } },
        },
        storageQuota: true,
        users: { select: SAFE_USER_SELECT },
      },
    });
    if (!org) throw new NotFoundException('Organisation introuvable');
    return org;
  }

  async update(id: string, dto: UpdateOrganizationDto, user: any) {
    this.assertCanManage(user);

    const org = await this.prisma.organization.findUnique({ where: { id } });
    if (!org) throw new NotFoundException('Organisation introuvable');

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

  // ═══════════════════════════════════════════════════════════
  //  SUSPENSION / RÉACTIVATION
  // ═══════════════════════════════════════════════════════════

  async suspend(id: string, reason: string, user: any) {
    this.assertCanManage(user);

    const org = await this.prisma.organization.findUnique({ where: { id } });
    if (!org) throw new NotFoundException('Organisation introuvable');
    if (org.type === 'INTERNE') {
      throw new ForbiddenException('Impossible de suspendre l\'organisation interne');
    }
    if (org.status === 'SUSPENDED') {
      throw new BadRequestException('Organisation déjà suspendue');
    }

    return this.prisma.organization.update({
      where: { id },
      data: {
        status: 'SUSPENDED',
        suspendedReason: reason.trim(),
        suspendedAt: new Date(),
      },
    });
  }

  async reactivate(id: string, user: any) {
    this.assertCanManage(user);

    const org = await this.prisma.organization.findUnique({ where: { id } });
    if (!org) throw new NotFoundException('Organisation introuvable');
    if (org.status !== 'SUSPENDED') {
      throw new BadRequestException('Organisation non suspendue');
    }

    return this.prisma.organization.update({
      where: { id },
      data: {
        status: 'ACTIVE',
        suspendedReason: null,
        suspendedAt: null,
      },
    });
  }

  // ═══════════════════════════════════════════════════════════
  //  IMPERSONATION — se connecter en tant qu'admin d'un tenant
  // ═══════════════════════════════════════════════════════════

  async impersonate(id: string, actor: any) {
    // Seul le SUPER_ADMIN owner peut impersonner
    if (actor.role !== 'SUPER_ADMIN' || !actor.isOwner) {
      throw new ForbiddenException('Seul un SUPER_ADMIN owner peut utiliser l\'impersonation');
    }

    const org = await this.prisma.organization.findUnique({
      where: { id },
      include: {
        users: {
          where: { isOwner: true, isActive: true },
          take: 1,
        },
      },
    });

    if (!org) throw new NotFoundException('Organisation introuvable');
    if (org.type === 'INTERNE') {
      throw new ForbiddenException('Impossible d\'impersonner l\'organisation interne');
    }
    if (org.users.length === 0) {
      throw new BadRequestException(
        'Aucun administrateur actif dans cette organisation. Créez-en un d\'abord.',
      );
    }

    const targetUser = org.users[0];

    // Audit log de l'impersonation
    await this.prisma.auditLog.create({
      data: {
        userId: actor.userId,
        organizationId: org.id,
        action: 'IMPERSONATE_START',
        entity: 'Organization',
        entityId: org.id,
        newValue: JSON.stringify({
          targetUserId: targetUser.id,
          targetEmail: targetUser.email,
          orgName: org.name,
        }),
      },
    });

    return {
      targetUser: {
        id: targetUser.id,
        email: targetUser.email,
        name: targetUser.name,
        role: targetUser.role,
        organizationId: org.id,
        isOwner: targetUser.isOwner,
      },
      organization: {
        id: org.id,
        name: org.name,
        slug: org.slug,
        type: org.type,
      },
      impersonatedBy: {
        userId: actor.userId,
        role: actor.role,
      },
    };
  }

  async remove(id: string, user: any) {
    this.assertCanManage(user);

    const org = await this.prisma.organization.findUnique({ where: { id } });
    if (!org) throw new NotFoundException('Organisation introuvable');
    if (org.type === 'INTERNE') {
      throw new ForbiddenException(
        "Impossible de supprimer l'organisation interne (NEXUS CORP)",
      );
    }
    return this.prisma.organization.delete({ where: { id } });
  }

  async findClientOrganizations() {
    return this.prisma.organization.findMany({
      where: { type: { not: 'INTERNE' } },
      include: {
        subscriptions: {
          include: { activeModules: { include: { module: true } } },
        },
        storageQuota: true,
      },
      orderBy: { name: 'asc' },
    });
  }

  // ═══════════════════════════════════════════════════════════
  //  TAGS & NOTES ADMIN (Super Admin uniquement)
  // ═══════════════════════════════════════════════════════════

  async updateTags(id: string, dto: { tags: string[]; notes?: string }, user: any) {
    this.assertCanManage(user);

    const org = await this.prisma.organization.findUnique({ where: { id } });
    if (!org) throw new NotFoundException('Organisation introuvable');

    // Nettoyer les tags : trim + dédup + ignorer vides
    const cleaned = Array.from(
      new Set(
        (dto.tags || [])
          .map((t) => String(t).trim())
          .filter((t) => t.length > 0 && t.length <= 30)
      )
    ).slice(0, 20);

    return this.prisma.organization.update({
      where: { id },
      data: {
        adminTags: cleaned,
        adminNotes: dto.notes !== undefined ? (dto.notes?.trim() || null) : undefined,
      },
      select: {
        id: true,
        adminTags: true,
        adminNotes: true,
      },
    });
  }
}
