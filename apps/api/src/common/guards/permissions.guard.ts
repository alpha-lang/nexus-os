import {
  Injectable, CanActivate, ExecutionContext, ForbiddenException, UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();
    const jwtUser = req.user;

    if (!jwtUser) return true;

    // ─── Mode API Key : contexte déjà validé par ApiKeyOrJwtGuard ───
    if (jwtUser.role === 'API' && req.apiContext) {
      // Une clé API a toujours le droit de lecture.
      // Les écritures sont vérifiées par ScopeGuard (WRITE / ADMIN).
      if (req.method !== 'GET' && req.method !== 'OPTIONS') {
        const scopes = jwtUser.scopes || [];
        if (!scopes.includes('WRITE') && !scopes.includes('ADMIN')) {
          throw new ForbiddenException(
            'Cette clé API ne permet pas les écritures (scope WRITE requis).',
          );
        }
      }
      return true;
    }

    // ─── Mode JWT classique ───
    const user = await this.prisma.user.findUnique({
      where: { id: jwtUser.userId },
      select: { id: true, role: true, isOwner: true, isActive: true, organizationId: true },
    });

    if (!user) throw new UnauthorizedException('Utilisateur introuvable');
    if (!user.isActive) throw new UnauthorizedException('Compte désactivé');

    req.user = {
      ...jwtUser,
      role: user.role,
      isOwner: user.isOwner,
      organizationId: user.organizationId,
    };

    if (user.role === 'SUPER_ADMIN' && user.isOwner) return true;

    const writerRoles = ['ADMIN', 'MANAGER', 'COMMERCIAL', 'RECEPTION', 'STOCK_MANAGER', 'FINANCE', 'RH'];
    if (
      user.organizationId &&
      writerRoles.includes(user.role) &&
      req.method !== 'GET' &&
      req.method !== 'OPTIONS'
    ) {
      return true;
    }

    if (req.method !== 'GET' && req.method !== 'OPTIONS') {
      throw new ForbiddenException('Accès refusé : vous ne pouvez que consulter les données.');
    }

    return true;
  }
}
