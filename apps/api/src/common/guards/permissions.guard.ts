import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma.service';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const jwtUser = request.user;

    if (!jwtUser) return true;

    const user = await this.prisma.user.findUnique({
      where: { id: jwtUser.userId },
      select: {
        id: true,
        role: true,
        isOwner: true,
        isActive: true,
        organizationId: true,
      },
    });

    if (!user) throw new UnauthorizedException('Utilisateur introuvable');
    if (!user.isActive) throw new UnauthorizedException('Compte désactivé');

    request.user = {
      ...jwtUser,
      role: user.role,
      isOwner: user.isOwner,
      organizationId: user.organizationId,
    };

    // Super Admin Owner : accès complet
    if (user.role === 'SUPER_ADMIN' && user.isOwner) return true;

    // Rôles autorisés à écrire dans leur organisation
    const writerRoles = ['ADMIN', 'MANAGER', 'COMMERCIAL', 'RECEPTION', 'STOCK_MANAGER', 'FINANCE', 'RH'];

    if (
      user.organizationId &&
      writerRoles.includes(user.role) &&
      request.method !== 'GET' &&
      request.method !== 'OPTIONS'
    ) {
      return true;
    }

    // Sinon, écriture refusée
    if (request.method !== 'GET' && request.method !== 'OPTIONS') {
      throw new ForbiddenException(
        'Accès refusé : vous ne pouvez que consulter les données.'
      );
    }

    return true;
  }
}
