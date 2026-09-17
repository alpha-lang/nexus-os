import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { PrismaService } from './prisma/prisma.service';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { AuditLogInterceptor } from './common/interceptors/audit-log.interceptor';
import { ValidationPipe, Logger } from '@nestjs/common';
import { ExpressAdapter } from '@nestjs/platform-express';
import express from 'express';

// ═══════════════════════════════════════════════════════════════
//  VALIDATION DE L'ENVIRONNEMENT AU BOOT
//  Empêche l'app de démarrer avec une config non sécurisée.
// ═══════════════════════════════════════════════════════════════
function validateEnv() {
  const errors: string[] = [];

  const required = ['JWT_SECRET', 'DATABASE_URL'];
  for (const key of required) {
    if (!process.env[key] || process.env[key]!.trim() === '') {
      errors.push(`  - ${key} est manquant`);
    }
  }

  const jwt = process.env.JWT_SECRET || '';
  if (jwt && jwt.length < 32) {
    errors.push(`  - JWT_SECRET est trop court (${jwt.length} chars, minimum 32)`);
  }
  if (jwt && ['secret', 'jwt_secret', 'changeme', 'test', 'dev'].includes(jwt.toLowerCase())) {
    errors.push(`  - JWT_SECRET utilise une valeur interdite (${jwt})`);
  }

  if (errors.length > 0) {
    Logger.error('❌ Configuration invalide au démarrage :', 'Bootstrap');
    errors.forEach((e) => Logger.error(e, 'Bootstrap'));
    Logger.error('Corrigez vos variables d\'environnement avant de relancer.', 'Bootstrap');
    process.exit(1);
  }

  Logger.log('✅ Variables d\'environnement validées', 'Bootstrap');
}

// Validation au chargement du module (avant NestFactory)
validateEnv();

const server = express();
let bootstrapPromise: Promise<void> | null = null;

async function bootstrap() {
  if (bootstrapPromise) return bootstrapPromise;

  bootstrapPromise = (async () => {
    const app = await NestFactory.create(AppModule, new ExpressAdapter(server), {
      logger: ['error', 'warn', 'log', 'debug', 'verbose'],
    });

    // ═══ CORS : liste blanche d'origines ═══
    const allowedOrigins = (
      process.env.ALLOWED_ORIGINS ||
      'https://nexus-plateforme.vercel.app,https://nexus-os-back.vercel.app,https://nexus-os-web.vercel.app,http://localhost:3000,http://localhost:3001'
    )
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    app.enableCors({
      origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
        if (!origin) return callback(null, true);
        if (allowedOrigins.includes(origin)) return callback(null, true);
        // Previews Vercel (uniquement hors production)
        if (
          process.env.VERCEL_ENV !== 'production' &&
          /^https:\/\/[a-z0-9-]+-elikantos-projects\.vercel\.app$/.test(origin)
        ) {
          return callback(null, true);
        }
        return callback(null, false);
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
      maxAge: 86400,
    });

    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        transformOptions: { enableImplicitConversion: true },
      }),
    );

    app.useGlobalFilters(new AllExceptionsFilter());

    // Audit trail global
    const prisma = app.get(PrismaService);
    app.useGlobalInterceptors(new AuditLogInterceptor(prisma));

    await app.init();
  })();

  return bootstrapPromise;
}

export default async function handler(req: any, res: any) {
  await bootstrap();
  return server(req, res);
}

if (!process.env.VERCEL && require.main === module) {
  bootstrap().then(() => {
    const port = process.env.PORT ?? 3001;
    server.listen(port, () => {
      Logger.log(`🚀 NEXUS API démarrée sur http://localhost:${port}`, 'Bootstrap');
    });
  });
}
