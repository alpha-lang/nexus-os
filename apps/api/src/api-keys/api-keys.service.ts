import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as crypto from 'crypto';

@Injectable()
export class ApiKeysService {
  constructor(private prisma: PrismaService) {}

  private hashKey(key: string): string {
    const pepper = process.env.JWT_SECRET || '';
    return crypto.createHmac('sha256', pepper).update(key).digest('hex');
  }

  private generateKey(): { plain: string; prefix: string; hash: string } {
    const random = crypto.randomBytes(24).toString('hex');
    const plain = `nexus_live_${random}`;
    const prefix = plain.slice(0, 16);
    const hash = this.hashKey(plain);
    return { plain, prefix, hash };
  }

  private isSuperAdmin(user: any) {
    return user.role === 'SUPER_ADMIN' && user.isOwner;
  }

  private async getOrgId(user: any): Promise<string> {
    if (!user.organizationId) throw new ForbiddenException('Organisation requise');
    return user.organizationId;
  }

  /**
   * Super Admin : voit toutes les clés (audit)
   * Tenant : voit les siennes
   */
  async findAll(user: any) {
    const where = this.isSuperAdmin(user) ? {} : { organizationId: await this.getOrgId(user) };

    return this.prisma.apiKey.findMany({
      where,
      include: {
        organization: { select: { id: true, name: true, type: true } },
        createdBy: { select: { id: true, email: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Création : le Super Admin ne peut PAS créer pour un autre tenant
   * (il doit s'impersonner s'il veut le faire).
   */
  async create(user: any, data: any) {
    if (this.isSuperAdmin(user)) {
      throw new ForbiddenException(
        'Le Super Admin ne peut pas créer de clé API pour un tenant. Utilisez l\'impersonation.',
      );
    }

    const organizationId = await this.getOrgId(user);
    if (!data.name?.trim()) throw new BadRequestException('Le nom est requis');

    const scopes = Array.isArray(data.scopes) && data.scopes.length > 0 ? data.scopes : ['READ'];
    const { plain, prefix, hash } = this.generateKey();

    const apiKey = await this.prisma.apiKey.create({
      data: {
        name: data.name.trim(),
        prefix,
        keyHash: hash,
        scopes,
        organizationId,
        createdById: user.userId,
        expiresAt: data.expiresAt ? new Date(data.expiresAt) : null,
      },
      include: { organization: { select: { id: true, name: true, type: true } } },
    });

    return {
      ...apiKey,
      key: plain,
      warning: 'Cette clé ne sera plus jamais affichée. Copiez-la maintenant.',
    };
  }

  /**
   * Modification (nom, scopes, expiration) : interdit au Super Admin.
   * Seul le tenant propriétaire peut modifier sa propre clé.
   */
  async update(user: any, id: string, data: any) {
    if (this.isSuperAdmin(user)) {
      throw new ForbiddenException(
        'Le Super Admin ne peut pas modifier une clé API. Utilisez l\'impersonation.',
      );
    }
    const key = await this.findOneScoped(user, id);
    return this.prisma.apiKey.update({
      where: { id: key.id },
      data: {
        name: data.name ?? undefined,
        isActive: data.isActive ?? undefined,
        scopes: data.scopes ?? undefined,
        expiresAt: data.expiresAt !== undefined
          ? (data.expiresAt ? new Date(data.expiresAt) : null)
          : undefined,
      },
    });
  }

  /**
   * Suppression : interdite au Super Admin.
   */
  async remove(user: any, id: string) {
    if (this.isSuperAdmin(user)) {
      throw new ForbiddenException(
        'Le Super Admin ne peut pas supprimer une clé API. Utilisez l\'impersonation.',
      );
    }
    const key = await this.findOneScoped(user, id);
    return this.prisma.apiKey.delete({ where: { id: key.id } });
  }

  /**
   * KILL SWITCH (Super Admin uniquement) — désactive d'urgence une clé compromise.
   * C'est une action de SÉCURITÉ légitime : elle trace dans l'audit log.
   */
  async killSwitch(user: any, id: string) {
    if (!this.isSuperAdmin(user)) {
      throw new ForbiddenException('Action réservée au Super Admin');
    }
    const key = await this.prisma.apiKey.findUnique({ where: { id } });
    if (!key) throw new NotFoundException('Clé introuvable');

    const updated = await this.prisma.apiKey.update({
      where: { id },
      data: { isActive: false },
      include: { organization: { select: { id: true, name: true } } },
    });

    // Trace dans l'audit log
    await this.prisma.auditLog.create({
      data: {
        userId: user.userId,
        organizationId: key.organizationId,
        action: 'KILL_API_KEY',
        entity: 'ApiKey',
        entityId: key.id,
        newValue: JSON.stringify({
          name: key.name,
          prefix: key.prefix,
          reason: 'Emergency kill switch',
        }),
      },
    }).catch(() => {});

    return updated;
  }

  /**
   * Réactive une clé désactivée (Super Admin only).
   */
  async reactivate(user: any, id: string) {
    if (!this.isSuperAdmin(user)) {
      throw new ForbiddenException('Action réservée au Super Admin');
    }
    const key = await this.prisma.apiKey.findUnique({ where: { id } });
    if (!key) throw new NotFoundException('Clé introuvable');

    const updated = await this.prisma.apiKey.update({
      where: { id },
      data: { isActive: true },
    });

    await this.prisma.auditLog.create({
      data: {
        userId: user.userId,
        organizationId: key.organizationId,
        action: 'REACTIVATE_API_KEY',
        entity: 'ApiKey',
        entityId: key.id,
        newValue: JSON.stringify({ name: key.name, prefix: key.prefix }),
      },
    }).catch(() => {});

    return updated;
  }

  private async findOneScoped(user: any, id: string) {
    const key = await this.prisma.apiKey.findUnique({ where: { id } });
    if (!key) throw new NotFoundException('Clé introuvable');
    if (key.organizationId !== user.organizationId) {
      throw new ForbiddenException('Accès refusé');
    }
    return key;
  }

  async validate(plain: string): Promise<{ organizationId: string; scopes: string[]; apiKeyId: string } | null> {
    if (!plain || !plain.startsWith('nexus_live_')) return null;

    const hash = this.hashKey(plain);
    const key = await this.prisma.apiKey.findUnique({ where: { keyHash: hash } });

    if (!key || !key.isActive) return null;
    if (key.expiresAt && key.expiresAt < new Date()) return null;

    this.prisma.apiKey.update({
      where: { id: key.id },
      data: { lastUsedAt: new Date() },
    }).catch(() => {});

    return {
      organizationId: key.organizationId,
      scopes: key.scopes,
      apiKeyId: key.id,
    };
  }
}
