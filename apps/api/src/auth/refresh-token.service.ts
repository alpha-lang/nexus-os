import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as crypto from 'crypto';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class RefreshTokenService {
  private readonly logger = new Logger(RefreshTokenService.name);

  // 15 minutes
  private readonly ACCESS_TOKEN_TTL = '15m';
  // 7 jours
  private readonly REFRESH_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000;

  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  /**
   * Génère un access token (15 min) + un refresh token (7j stocké en DB).
   */
  async generateTokens(
    payload: any,
    meta: { userAgent?: string; ip?: string } = {},
  ) {
    // Access token : 15 minutes
    const accessToken = this.jwtService.sign(payload, {
      expiresIn: this.ACCESS_TOKEN_TTL,
    });

    // Refresh token : valeur aléatoire (pas un JWT) — plus sûr, révocable
    const refreshTokenValue = crypto.randomBytes(64).toString('hex');

    await this.prisma.refreshToken.create({
      data: {
        token: refreshTokenValue,
        userId: payload.userId,
        expiresAt: new Date(Date.now() + this.REFRESH_TOKEN_TTL_MS),
        userAgent: meta.userAgent?.slice(0, 200) || null,
        ipAddress: meta.ip || null,
      },
    });

    return {
      accessToken,
      refreshToken: refreshTokenValue,
      expiresIn: 15 * 60, // 15 min en secondes
    };
  }

  /**
   * Valide un refresh token et génère un nouveau couple access + refresh.
   * L'ancien refresh est révoqué (rotation de token).
   */
  async refresh(refreshToken: string, meta: { userAgent?: string; ip?: string } = {}) {
    const stored = await this.prisma.refreshToken.findUnique({
      where: { token: refreshToken },
      include: { user: true },
    });

    if (!stored) {
      throw new UnauthorizedException('Refresh token invalide');
    }

    if (stored.revokedAt) {
      this.logger.warn(`Tentative d'utiliser un refresh token révoqué pour ${stored.user.email}`);
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

    // Générer un nouveau couple
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
    const stored = await this.prisma.refreshToken.findUnique({
      where: { token: refreshToken },
    });

    if (stored && !stored.revokedAt) {
      await this.prisma.refreshToken.update({
        where: { id: stored.id },
        data: { revokedAt: new Date() },
      });
    }
  }

  /**
   * Révoque TOUS les refresh tokens d'un utilisateur (logout partout).
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
