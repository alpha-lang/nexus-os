import { Controller, Post, Body, Get, UseGuards, Req } from '@nestjs/common';
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
}
