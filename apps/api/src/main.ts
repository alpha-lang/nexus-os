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
      logger: ['error', 'warn', 'log'],
    });
    app.enableCors({ origin: true, credentials: true });
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
