import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { ApiKeysService } from '../../api-keys/api-keys.service';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

@Injectable()
export class ApiKeyOrJwtGuard implements CanActivate {
  constructor(
    private jwtService: JwtService,
    private apiKeysService: ApiKeysService,
    private reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // 0. Routes marquées @Public() → laisse passer
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const req = context.switchToHttp().getRequest();
    const authHeader = req.headers.authorization;
    const apiKeyHeader = req.headers['x-api-key'];

    // Mode 1 : X-API-Key
    if (apiKeyHeader) {
      const ctx = await this.apiKeysService.validate(String(apiKeyHeader));
      if (!ctx) throw new UnauthorizedException('Clé API invalide ou expirée');

      req.user = {
        userId: `api:${ctx.apiKeyId}`,
        role: 'API',
        organizationId: ctx.organizationId,
        isOwner: false,
        scopes: ctx.scopes,
      };
      req.apiContext = ctx;
      return true;
    }

    // Mode 2 : Bearer JWT
    if (authHeader?.startsWith('Bearer ')) {
      try {
        const payload = await this.jwtService.verifyAsync(authHeader.slice(7));
        req.user = payload;
        return true;
      } catch {
        throw new UnauthorizedException('Token invalide ou expiré');
      }
    }

    throw new UnauthorizedException('Authentification requise');
  }
}
