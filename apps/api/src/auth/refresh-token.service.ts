import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as crypto from 'crypto';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Gère les access tokens (JWT court) + refresh tokens (opaques, hashés en DB).
 *
 * SÉCURITÉ :
 *  - Le refresh token en clair n'est JAMAIS stocké en base
 *  - Seul son SHA-256 (pepper JWT_SECRET) l'est
 *  - Rotation à chaque refresh
 *  - Réutilisation d'un token révoqué = révocation de TOUS les tokens du user
 */
@Injectable()
export class RefreshTokenService {
  private readonly logger = new Logger(RefreshTokenService.name);

  private readonly ACCESS_TOKEN_TTL = '15m';
  private readonly REFRESH_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000;

  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  /**
   * Hash déterministe d'un token avec un pepper serveur.
   */
  private hashToken(token: string): string {
    const pepper = process.env.JWT_SECRET || '';
    return crypto.createHmac('sha256', pepper).update(token).digest('hex');
  }

  /**
   * Génère un access token (15 min) + un refresh token (7j stocké hashé).
   */
  async generateTokens(
    payload: any,
    meta: { userAgent?: string; ip?: string } = {},
  ) {
    const accessToken = this.jwtService.sign(payload, {
      expiresIn: this.ACCESS_TOKEN_TTL,
    });

    const refreshTokenValue = crypto.randomBytes(64).toString('hex');
    const tokenHash = this.hashToken(refreshTokenValue);

    await this.prisma.refreshToken.create({
      data: {
        tokenHash,
        userId: payload.userId,
        expiresAt: new Date(Date.now() + this.REFRESH_TOKEN_TTL_MS),
        userAgent: meta.userAgent?.slice(0, 200) || null,
        ipAddress: meta.ip || null,
      },
    });

    return {
      accessToken,
      refreshToken: refreshTokenValue,
      expiresIn: 15 * 60,
    };
  }

  /**
   * Valide un refresh token et génère un nouveau couple access + refresh.
   */
  async refresh(
    refreshToken: string,
    meta: { userAgent?: string; ip?: string } = {},
  ) {
    if (!refreshToken || refreshToken.length < 32) {
      throw new UnauthorizedException('Refresh token invalide');
    }

    const tokenHash = this.hashToken(refreshToken);

    const stored = await this.prisma.refreshToken.findUnique({
      where: { tokenHash },
      include: { user: true },
    });

    if (!stored) {
      this.logger.warn('Tentative avec un refresh token inconnu');
      throw new UnauthorizedException('Refresh token invalide');
    }

    if (stored.revokedAt) {
      this.logger.warn(
        `🔒 Réutilisation d'un refresh token révoqué pour ${stored.user.email} — révocation de tous les tokens`,
      );
      await this.prisma.refreshToken.updateMany({
        where: { userId: stored.userId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      throw new UnauthorizedException('Refresh token révoqué');
    }

    if (stored.expiresAt < new Date()) {
      throw new UnauthorizedException('Refresh token expiré');
    }

    if (!stored.user.isActive) {
      throw new UnauthorizedException('Compte désactivé');
    }

    // Rotation : révoquer l'ancien
    await this.prisma.refreshToken.update({
      where: { id: stored.id },
      data: { revokedAt: new Date() },
    });

    const payload = {
      userId: stored.user.id,
      role: stored.user.role,
      organizationId: stored.user.organizationId,
      isOwner: stored.user.isOwner,
    };

    const tokens = await this.generateTokens(payload, meta);

    return {
      ...tokens,
      user: {
        id: stored.user.id,
        email: stored.user.email,
        role: stored.user.role,
        isOwner: stored.user.isOwner,
        organizationId: stored.user.organizationId,
      },
    };
  }

  /**
   * Révoque un refresh token (logout).
   */
  async revoke(refreshToken: string) {
    const tokenHash = this.hashToken(refreshToken);
    await this.prisma.refreshToken.updateMany({
      where: { tokenHash, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  /**
   * Révoque TOUS les refresh tokens d'un utilisateur.
   */
  async revokeAllForUser(userId: string) {
    await this.prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  /**
   * Nettoyage : supprime les tokens expirés depuis plus de 30 jours.
   */
  async cleanup() {
    const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const result = await this.prisma.refreshToken.deleteMany({
      where: { expiresAt: { lt: cutoff } },
    });
    return result.count;
  }

  // ═══════════════════════════════════════════════════════════
  //  SESSIONS ADMIN
  // ═══════════════════════════════════════════════════════════

  /**
   * Liste toutes les sessions actives (refresh tokens non révoqués + non expirés).
   * Inclut le user et l'organisation pour filtrer/trier.
   */
  async listAllSessions(filters: {
    userId?: string;
    organizationId?: string;
    includeRevoked?: boolean;
    take?: number;
  } = {}) {
    const where: any = {
      expiresAt: { gt: new Date() },
    };
    if (!filters.includeRevoked) {
      where.revokedAt = null;
    }
    if (filters.userId) where.userId = filters.userId;
    if (filters.organizationId) {
      where.user = { organizationId: filters.organizationId };
    }

    const sessions = await this.prisma.refreshToken.findMany({
      where,
      include: {
        user: {
          select: {
            id: true, email: true, name: true, role: true,
            isActive: true,
            organization: { select: { id: true, name: true, slug: true, type: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: Math.min(filters.take || 200, 500),
    });

    return sessions.map((s) => ({
      id: s.id,
      createdAt: s.createdAt,
      expiresAt: s.expiresAt,
      revokedAt: s.revokedAt,
      userAgent: s.userAgent,
      ipAddress: s.ipAddress,
      user: s.user,
      isActive: !s.revokedAt && s.expiresAt > new Date(),
      // Ne JAMAIS exposer le tokenHash
    }));
  }

  /**
   * Stats globales des sessions.
   */
  async getSessionsStats() {
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 86400000);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 86400000);

    const [
      totalActive,
      totalRevoked,
      last24h,
      last7d,
      byRole,
      byOrg,
      uniqueUsers,
    ] = await Promise.all([
      this.prisma.refreshToken.count({
        where: { revokedAt: null, expiresAt: { gt: now } },
      }),
      this.prisma.refreshToken.count({
        where: { revokedAt: { not: null } },
      }),
      this.prisma.refreshToken.count({
        where: { createdAt: { gte: oneDayAgo }, revokedAt: null },
      }),
      this.prisma.refreshToken.count({
        where: { createdAt: { gte: sevenDaysAgo }, revokedAt: null },
      }),
      this.prisma.refreshToken.groupBy({
        by: ['userId'],
        where: { revokedAt: null, expiresAt: { gt: now } },
        _count: true,
      }),
      this.prisma.refreshToken.findMany({
        where: { revokedAt: null, expiresAt: { gt: now } },
        select: {
          user: { select: { organization: { select: { id: true, name: true } } } },
        },
      }),
      this.prisma.refreshToken.findMany({
        where: { revokedAt: null, expiresAt: { gt: now } },
        select: { userId: true },
        distinct: ['userId'],
      }),
    ]);

    // Top 5 users avec le plus de sessions
    const topUsers = byRole
      .sort((a, b) => b._count - a._count)
      .slice(0, 5);

    const topUserIds = topUsers.map((u) => u.userId);
    const users = topUserIds.length
      ? await this.prisma.user.findMany({
          where: { id: { in: topUserIds } },
          select: { id: true, email: true, name: true },
        })
      : [];

    // Top 5 orgs
    const orgMap: Record<string, { name: string; count: number }> = {};
    for (const s of byOrg) {
      const org = s.user?.organization;
      if (!org) continue;
      if (!orgMap[org.id]) orgMap[org.id] = { name: org.name, count: 0 };
      orgMap[org.id].count++;
    }

    return {
      totalActive,
      totalRevoked,
      totalUniqueUsers: uniqueUsers.length,
      created24h: last24h,
      created7d: last7d,
      topUsers: topUsers.map((u) => {
        const user = users.find((x) => x.id === u.userId);
        return {
          userId: u.userId,
          email: user?.email || 'Inconnu',
          name: user?.name || null,
          count: u._count,
        };
      }),
      topOrgs: Object.entries(orgMap)
        .map(([id, data]) => ({ id, name: data.name, count: data.count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5),
    };
  }

  /**
   * Révoque une session par ID (avec vérification des droits).
   */
  async revokeSessionById(
    sessionId: string,
    actor: { userId: string; role: string; isOwner: boolean; organizationId?: string | null },
  ) {
    const session = await this.prisma.refreshToken.findUnique({
      where: { id: sessionId },
      include: {
        user: { select: { id: true, email: true, organizationId: true } },
      },
    });

    if (!session) return { success: false, message: 'Session introuvable' };
    if (session.revokedAt) return { success: true, message: 'Déjà révoquée' };

    // Autorisations :
    // 1. SUPER_ADMIN owner → révoque tout
    // 2. ADMIN de la même org → révoque les sessions de son org
    // 3. L'utilisateur lui-même → révoque ses propres sessions
    const isSuperAdmin = actor.role === 'SUPER_ADMIN' && actor.isOwner;
    const isSelf = actor.userId === session.user.id;
    const isSameOrg =
      actor.organizationId &&
      session.user.organizationId === actor.organizationId &&
      ['ADMIN', 'MANAGER'].includes(actor.role);

    if (!isSuperAdmin && !isSelf && !isSameOrg) {
      return { success: false, message: 'Non autorisé' };
    }

    await this.prisma.refreshToken.update({
      where: { id: sessionId },
      data: { revokedAt: new Date() },
    });

    return { success: true, message: 'Session révoquée' };
  }

  /**
   * Révoque TOUTES les sessions d'un utilisateur.
   */
  async revokeAllUserSessions(
    targetUserId: string,
    actor: { userId: string; role: string; isOwner: boolean; organizationId?: string | null },
  ) {
    const target = await this.prisma.user.findUnique({
      where: { id: targetUserId },
      select: { id: true, email: true, organizationId: true },
    });

    if (!target) return { success: false, message: 'Utilisateur introuvable' };

    const isSuperAdmin = actor.role === 'SUPER_ADMIN' && actor.isOwner;
    const isSelf = actor.userId === targetUserId;
    const isSameOrg =
      actor.organizationId &&
      target.organizationId === actor.organizationId &&
      ['ADMIN', 'MANAGER'].includes(actor.role);

    if (!isSuperAdmin && !isSelf && !isSameOrg) {
      return { success: false, message: 'Non autorisé' };
    }

    const result = await this.prisma.refreshToken.updateMany({
      where: { userId: targetUserId, revokedAt: null },
      data: { revokedAt: new Date() },
    });

    return {
      success: true,
      count: result.count,
      message: `${result.count} session(s) révoquée(s)`,
    };
  }

}
