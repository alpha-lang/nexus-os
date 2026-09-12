import 'reflect-metadata';
import * as path from 'path';
import * as fs from 'fs';
import express from 'express';   // ← default import (pas namespace)

// ─────────────────────────────────────────────────────────────
// 🔑 1. Forcer Prisma à utiliser l'engine qu'on a copié
//     AVANT tout import qui charge @prisma/client
// ─────────────────────────────────────────────────────────────
const engineCandidates = [
  path.join(__dirname, '.prisma', 'client', 'libquery_engine-rhel-openssl-3.0.x.so.node'),
  path.join(__dirname, '.prisma', 'client', 'libquery_engine-debian-openssl-3.0.x.so.node'),
];

const enginePath = engineCandidates.find((p) => fs.existsSync(p));

if (enginePath) {
  process.env.PRISMA_QUERY_ENGINE_LIBRARY = enginePath;
  console.log('[Prisma] Engine forcé :', enginePath);
} else {
  console.warn('[Prisma] ⚠️ Aucun engine trouvé dans :', __dirname);
  console.warn('[Prisma]    Candidats testés :');
  engineCandidates.forEach((p) => console.warn('      -', p, fs.existsSync(p)));
}

// ─────────────────────────────────────────────────────────────
// 🔑 2. Imports NestJS APRÈS avoir défini l'env var
// ─────────────────────────────────────────────────────────────
const { NestFactory } = require('@nestjs/core');
const { ExpressAdapter } = require('@nestjs/platform-express');
const { AppModule } = require('../src/app.module');

const server = express();
let bootstrapPromise: Promise<express.Express> | null = null;

async function bootstrap(): Promise<express.Express> {
  if (bootstrapPromise) return bootstrapPromise;

  bootstrapPromise = (async () => {
    const app = await NestFactory.create(AppModule, new ExpressAdapter(server), {
      logger: ['error', 'warn'],
    });
    app.enableCors();
    await app.init();
    return server;
  })();

  return bootstrapPromise;
}

export default async function handler(req: any, res: any) {
  try {
    const app = await bootstrap();
    return app(req, res);
  } catch (err) {
    console.error('Handler error:', err);
    res.status(500).json({
      error: 'Internal Server Error',
      message: err instanceof Error ? err.message : String(err),
    });
  }
}
