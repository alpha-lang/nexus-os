import { Controller, Post, Body, Get, Delete, Param, Query, UseGuards, Req, ForbiddenException } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { RefreshTokenService } from './refresh-token.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly refreshTokenService: RefreshTokenService,
  ) {}

  // Anti brute-force : max 5 tentatives / 15 min / IP
  @Throttle({ default: { limit: 5, ttl: 900_000 } })
  @Post('login')
  async login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Post('register')
  async register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }


  // ═══ Refresh : regénère un access token à partir d'un refresh token ═══
  // Anti brute-force : 10 tentatives / 15 min / IP
  @Throttle({ default: { limit: 10, ttl: 900_000 } })
  @Post('refresh')
  async refresh(@Body() body: { refreshToken: string }, @Req() req: any) {
    return this.refreshTokenService.refresh(body.refreshToken, {
      userAgent: req.headers['user-agent'],
      ip: req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.ip,
    });
  }

  // ═══ Logout : révoque le refresh token ═══
  @Post('logout')
  async logout(@Body() body: { refreshToken?: string }) {
    if (body.refreshToken) {
      await this.refreshTokenService.revoke(body.refreshToken);
    }
    return { success: true };
  }

  // ═══ Logout partout : révoque tous les refresh tokens de l'utilisateur ═══
  @UseGuards(JwtAuthGuard)
  @Post('logout-all')
  async logoutAll(@Req() req: any) {
    await this.refreshTokenService.revokeAllForUser(req.user.userId);
    return { success: true };
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  async me(@Req() req: any) {
    return this.authService.getProfile(req.user.userId);
  }

  // ═══ Impersonation : génère un token pour l'admin cible ═══
  @UseGuards(JwtAuthGuard)
  @Post('impersonate-token')
  async impersonateToken(@Body() body: { targetUserId: string }, @Req() req: any) {
    return this.authService.generateImpersonationToken(req.user, body.targetUserId);
  }

  // ═══════════════════════════════════════════════════════════
  //  SESSIONS
  // ═══════════════════════════════════════════════════════════

  /**
   * Liste toutes les sessions (SUPER_ADMIN : toutes, sinon : ses propres sessions).
   */
  @UseGuards(JwtAuthGuard)
  @Get('sessions')
  async listSessions(@Req() req: any, @Query() query: any) {
    const user = req.user;
    const isSuperAdmin = user.role === 'SUPER_ADMIN' && user.isOwner;

    const filters: any = { take: query.take ? parseInt(query.take) : 200 };

    if (!isSuperAdmin) {
      // Un user normal ne voit que ses propres sessions
      filters.userId = user.userId;
    } else {
      // SUPER_ADMIN : peut filtrer par user ou org
      if (query.userId) filters.userId = query.userId;
      if (query.organizationId) filters.organizationId = query.organizationId;
    }

    return this.refreshTokenService.listAllSessions(filters);
  }

  /**
   * Stats des sessions (SUPER_ADMIN uniquement).
   */
  @UseGuards(JwtAuthGuard)
  @Get('sessions/stats')
  async sessionsStats(@Req() req: any) {
    const user = req.user;
    if (!(user.role === 'SUPER_ADMIN' && user.isOwner)) {
      throw new ForbiddenException('Accès réservé au Super Admin');
    }
    return this.refreshTokenService.getSessionsStats();
  }

  /**
   * Révoque une session par ID.
   */
  @UseGuards(JwtAuthGuard)
  @Delete('sessions/:id')
  async revokeSession(@Req() req: any, @Param('id') id: string) {
    return this.refreshTokenService.revokeSessionById(id, req.user);
  }

  /**
   * Révoque TOUTES les sessions d'un utilisateur.
   */
  @UseGuards(JwtAuthGuard)
  @Delete('sessions/user/:userId')
  async revokeUserSessions(@Req() req: any, @Param('userId') userId: string) {
    return this.refreshTokenService.revokeAllUserSessions(userId, req.user);
  }

}
