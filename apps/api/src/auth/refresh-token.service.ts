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
}
