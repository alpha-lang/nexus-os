import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { SCOPES_KEY } from '../decorators/require-scope.decorator';

@Injectable()
export class ScopeGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<string[]>(SCOPES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!required || required.length === 0) return true;

    const user = context.switchToHttp().getRequest().user;
    if (user?.role !== 'API') return true; // JWT → géré ailleurs

    const scopes = user.scopes || [];
    const ok = required.every((s) => scopes.includes(s) || scopes.includes('ADMIN'));
    if (!ok) {
      throw new ForbiddenException(
        `Scopes requis : ${required.join(', ')} — votre clé : ${scopes.join(', ')}`,
      );
    }
    return true;
  }
}
