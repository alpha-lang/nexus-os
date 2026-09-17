import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ExpressAdapter } from '@nestjs/platform-express';
import express from 'express';

const server = express();
let bootstrapPromise: Promise<void> | null = null;

async function bootstrap() {
  if (bootstrapPromise) return bootstrapPromise;

  bootstrapPromise = (async () => {
    const app = await NestFactory.create(AppModule, new ExpressAdapter(server), {
      logger: ['error', 'warn', 'log', 'debug', 'verbose'],
    });

    // ═══ CORS : liste blanche d'origines ═══
    const allowedOrigins = [
      'https://nexus-plateforme.vercel.app',
      'https://nexus-os-back.vercel.app',
      'https://nexus-os-web.vercel.app',
      'http://localhost:3000',
      'http://localhost:3001',
    ];

    app.enableCors({
      origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
        // Autorise requêtes sans origin (curl, Postman, serverless-to-serverless)
        if (!origin) return callback(null, true);
        // Origine explicitement autorisée
        if (allowedOrigins.includes(origin)) return callback(null, true);
        // Previews Vercel (branches/PR du team)
        if (/^https:\/\/[a-z0-9-]+-elikantos-projects\.vercel\.app$/.test(origin)) {
          return callback(null, true);
        }
        // Origine refusée : on n'ajoute PAS les headers CORS
        // Le navigateur bloquera la réponse tout seul (pas de 500)
        return callback(null, false);
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
      maxAge: 86400,
    });

    await app.init();
  })();

  return bootstrapPromise;
}

// ✅ Export par défaut pour Vercel (handler serverless)
export default async function handler(req: any, res: any) {
  await bootstrap();
  return server(req, res);
}

// ✅ Dev local uniquement (pas exécuté sur Vercel)
if (!process.env.VERCEL && require.main === module) {
  bootstrap().then(() => {
    const port = process.env.PORT ?? 3001;
    server.listen(port, () => {
      console.log(`🚀 NEXUS API démarrée sur http://localhost:${port}`);
    });
  });
}
