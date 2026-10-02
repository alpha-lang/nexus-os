import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { JwtService } from '@nestjs/jwt';
import { MaintenanceService } from './maintenance.service';

// Routes TOUJOURS accessibles, même en maintenance
const PUBLIC_PATHS = [
  '/health',
  '/auth/login',
  '/auth/refresh',
  '/auth/logout',
  '/auth/me',
  '/maintenance/status',
  '/announcements/active',
  '/feature-flags/my',
];

@Injectable()
export class MaintenanceMiddleware implements NestMiddleware {
  constructor(
    private readonly service: MaintenanceService,
    private readonly jwtService: JwtService,
  ) {}

  async use(req: Request, res: Response, next: NextFunction) {
    const path = (req.baseUrl || '') + (req.path || '');

    // 1. Routes publiques → laisse passer
    if (PUBLIC_PATHS.some((p) => path.startsWith(p))) return next();

    // 2. Check maintenance
    const { on, message, scheduledEnd } = await this.service.isMaintenanceOn();
    if (!on) return next();

    // 3. Lire le rôle de l'utilisateur (JWT)
    let role: string | null = null;
    const auth = req.headers.authorization;
    if (auth?.startsWith('Bearer ')) {
      try {
        const payload: any = this.jwtService.verify(auth.slice(7));
        role = payload.role;
      } catch { /* token invalide → non super admin */ }
    }

    // 4. SUPER_ADMIN passe toujours
    if (role === 'SUPER_ADMIN') return next();

    // 5. Sinon → 503
    return res.status(503).json({
      statusCode: 503,
      code: 'MAINTENANCE_MODE',
      message,
      scheduledEnd,
    });
  }
}
