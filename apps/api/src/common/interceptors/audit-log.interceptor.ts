import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable, tap, catchError, throwError } from 'rxjs';
import { PrismaService } from '../../prisma/prisma.service';

// Routes à ne PAS auditer (bruit)
const SKIP_PATTERNS = [
  /^\/health/,
  /^\/auth\/refresh/,
  /^\/search/,
  /^\/dashboard/,
];

// Méthodes HTTP auditées
const MUTATION_METHODS = new Set(['POST', 'PATCH', 'PUT', 'DELETE']);

@Injectable()
export class AuditLogInterceptor implements NestInterceptor {
  private readonly logger = new Logger('AuditLog');

  constructor(private prisma: PrismaService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const req = context.switchToHttp().getRequest();
    const method = (req.method || '').toUpperCase();
    const path = req.route?.path || req.url || '';

    if (!MUTATION_METHODS.has(method)) return next.handle();
    if (SKIP_PATTERNS.some((p) => p.test(path))) return next.handle();

    const user = req.user || {};
    const startedAt = Date.now();

    return next.handle().pipe(
      tap((response) => {
        this.write({
          userId: user.userId || null,
          organizationId: user.organizationId || null,
          action: `${method} ${path}`,
          entity: this.extractEntity(path),
          entityId: this.extractEntityId(path, req, response),
          newValue: this.safeSerialize(response),
          ipAddress: this.extractIp(req),
        });
      }),
      catchError((err) => {
        this.write({
          userId: user.userId || null,
          organizationId: user.organizationId || null,
          action: `${method} ${path} [ERROR]`,
          entity: this.extractEntity(path),
          entityId: this.extractEntityId(path, req, null),
          newValue: JSON.stringify({ error: err?.message || String(err) }).slice(0, 2000),
          ipAddress: this.extractIp(req),
        });
        return throwError(() => err);
      }),
    );
  }

  private write(data: any) {
    // Fire & forget : ne bloque jamais la réponse HTTP
    this.prisma.auditLog
      .create({
        data: {
          userId: data.userId,
          organizationId: data.organizationId,
          action: data.action,
          entity: data.entity,
          entityId: data.entityId,
          newValue: data.newValue,
          ipAddress: data.ipAddress,
        },
      })
      .catch((e) => this.logger.warn(`AuditLog write failed: ${e.message}`));
  }

  private extractEntity(path: string): string | null {
    // "/users/:id" → "users"
    const parts = path.split('/').filter(Boolean);
    return parts[0] || null;
  }

  private extractEntityId(path: string, req: any, response: any): string | null {
    return (
      response?.id ||
      req.params?.id ||
      req.body?.id ||
      null
    );
  }

  private safeSerialize(obj: any): string | null {
    try {
      // Retire les champs sensibles
      const clone = JSON.parse(JSON.stringify(obj ?? null));
      if (clone && typeof clone === 'object') {
        delete clone.password;
        delete clone.passwordHash;
        delete clone.token;
        delete clone.refreshToken;
        delete clone.accessToken;
      }
      const s = JSON.stringify(clone);
      return s.length > 2000 ? s.slice(0, 2000) + '…' : s;
    } catch {
      return null;
    }
  }

  private extractIp(req: any): string | null {
    return (
      (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
      req.ip ||
      null
    );
  }
}
