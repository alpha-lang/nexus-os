import {
  Injectable,
  UnauthorizedException,
  ConflictException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import { RefreshTokenService } from './refresh-token.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private refreshTokenService: RefreshTokenService,
  ) {}

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findFirst({ where: { email: dto.email  } });
    if (!user) throw new UnauthorizedException('Identifiants invalides');
    if (!user.isActive) throw new UnauthorizedException('Compte désactivé');

    const isValid = await bcrypt.compare(dto.password, user.password);
    if (!isValid) throw new UnauthorizedException('Identifiants invalides');

    const payload = {
      userId: user.id,
      role: user.role,
      organizationId: user.organizationId,
      isOwner: user.isOwner,
    };
    const tokens = await this.refreshTokenService.generateTokens(payload);
    return {
      ...tokens,
      token: tokens.accessToken, // Compat avec l'ancien frontend
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        isOwner: user.isOwner,
        organizationId: user.organizationId,
      },
    };
  }

  async register(dto: RegisterDto) {
    const existing = await this.prisma.user.findFirst({ where: { email: dto.email  } });
    if (existing) throw new ConflictException('Email déjà utilisé');

    const hashedPassword = await bcrypt.hash(dto.password, 10);
    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        password: hashedPassword,
        name: dto.name || null,
        role: dto.role || 'USER',
        organizationId: dto.organizationId || null,
        isOwner: false,
      },
    });

    const payload = {
      userId: user.id,
      role: user.role,
      organizationId: user.organizationId,
      isOwner: user.isOwner,
    };
    const tokens = await this.refreshTokenService.generateTokens(payload);
    return {
      ...tokens,
      token: tokens.accessToken,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        isOwner: user.isOwner,
        organizationId: user.organizationId,
      },
    };
  }

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isOwner: true,
        organizationId: true,
        isActive: true,
        organization: {
          select: { id: true, type: true, name: true },
        },
      },
    });

    if (!user) throw new UnauthorizedException('Utilisateur introuvable');

    // Super admin owner : pas de modules (menu admin fixe côté front)
    if (user.role === 'SUPER_ADMIN' && user.isOwner) {
      return { ...user, modules: [] };
    }

    if (!user.organizationId) {
      return { ...user, modules: [] };
    }

    // Un abonnement donne accès aux modules s'il est TRIAL ou ACTIVE.
    // SUSPENDED et EXPIRED ne donnent AUCUN accès.
    const activeSubscription = await this.prisma.subscription.findFirst({
      where: {
        organizationId: user.organizationId,
        status: { in: ['ACTIVE', 'TRIAL'] },
      },
      orderBy: { createdAt: 'desc' },
      include: {
        activeModules: {
          where: { isActive: true },
          include: {
            module: { select: { name: true, route: true, status: true } },
          },
        },
      },
    });

    const modules = (activeSubscription?.activeModules || [])
      .filter((am) => am.module?.status === 'ACTIVE')
      .map((am) => ({
        name: am.module.name,
        route: am.module.route,
      }));

    return {
      ...user,
      modules,
    };
  }
}
