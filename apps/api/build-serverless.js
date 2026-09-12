const esbuild = require('esbuild');
const path = require('path');
const fs = require('fs');

/**
 * Cherche le dossier .prisma/client généré par `prisma generate`,
 * en gérant la structure pnpm (.pnpm/...), npm, et yarn.
 */
function findPrismaClientDir() {
  const candidates = [];

  // 1) Le plus fiable : demander à Node où est @prisma/client
  try {
    const prismaClientPkg = require.resolve('@prisma/client/package.json', {
      paths: [__dirname],
    });
    // .../@prisma/client/package.json  →  .../@prisma/.prisma/client
    const nmDir = path.dirname(path.dirname(prismaClientPkg)); // .../node_modules
    candidates.push(path.join(nmDir, '.prisma', 'client'));
    // pnpm: aussi tenter le sibling "\.prisma" au même niveau
    candidates.push(path.join(nmDir, '..', '.prisma', 'client'));
  } catch (_) { /* ignore */ }

  // 2) require.resolve sur .prisma/client directement
  try {
    const dotPrisma = require.resolve('.prisma/client/package.json', {
      paths: [__dirname],
    });
    candidates.push(path.dirname(dotPrisma));
  } catch (_) { /* ignore */ }

  // 3) Fallbacks classiques
  candidates.push(
    path.resolve(__dirname, 'node_modules/.prisma/client'),
    path.resolve(__dirname, '../../node_modules/.prisma/client'),
  );

  // 4) Scan pnpm : cherche @prisma+client@*/node_modules/.prisma/client
  const pnpmDir = path.resolve(__dirname, '../../node_modules/.pnpm');
  if (fs.existsSync(pnpmDir)) {
    for (const entry of fs.readdirSync(pnpmDir)) {
      if (entry.startsWith('@prisma+client@')) {
        candidates.push(
          path.join(pnpmDir, entry, 'node_modules', '.prisma', 'client'),
        );
      }
    }
  }

  const found = candidates.find((p) => {
    try {
      return fs.existsSync(p) && fs.statSync(p).isDirectory();
    } catch (_) {
      return false;
    }
  });

  if (!found) {
    console.error('❌ .prisma/client introuvable. Candidats testés :');
    candidates.forEach((c) => console.error('   -', c));
    process.exit(1);
  }

  return found;
}

async function build() {
  // 1. Bundle TypeScript → JS
  await esbuild.build({
    entryPoints: [path.resolve(__dirname, 'api/serverless-entry.ts')],
    bundle: true,
    platform: 'node',
    target: 'node20',
    outfile: path.resolve(__dirname, 'api/bundle.js'),
    format: 'cjs',
    // Prisma reste externe : le moteur natif (.so.node) ne peut pas être bundlé
    external: [
      '@prisma/client',
      '.prisma/client',
      '@nestjs/microservices',
      '@nestjs/microservices/*',
      '@nestjs/websockets',
      '@nestjs/websockets/*',
      '@nestjs/platform-socket.io',
    ],
    tsconfigRaw: {
      compilerOptions: {
        emitDecoratorMetadata: true,
        experimentalDecorators: true,
        target: 'ES2021',
        module: 'CommonJS',
        esModuleInterop: true,
        allowSyntheticDefaultImports: true,
      },
    },
    footer: {
      js: 'module.exports = module.exports.default; module.exports.default = module.exports;',
    },
    minify: false,
    sourcemap: false,
    logLevel: 'info',
  });

  // 2. Copier .prisma/client à côté du bundle (dans api/.prisma/client)
  //    → Vercel l'embarquera via includeFiles
  const src = findPrismaClientDir();
  const dst = path.resolve(__dirname, 'api/.prisma/client');

  fs.rmSync(dst, { recursive: true, force: true });
  fs.mkdirSync(dst, { recursive: true });
  fs.cpSync(src, dst, { recursive: true });

  const files = fs.readdirSync(dst);
  const engines = files.filter((f) => f.startsWith('libquery_engine'));

  console.log('✅ Engine Prisma copié');
  console.log('   source :', src);
  console.log('   dest   :', dst);
  console.log('   files  :', files.length, 'fichiers');
  console.log('   engines:', engines.length ? engines.join(', ') : '❌ AUCUN ENGINE TROUVÉ');

  if (!engines.some((f) => f.includes('rhel-openssl-3.0.x'))) {
    console.error('');
    console.error('❌ ATTENTION : le moteur rhel-openssl-3.0.x (Vercel) n\'est PAS présent !');
    console.error('   Vérifiez que prisma/schema.prisma contient :');
    console.error('     binaryTargets = ["native", "rhel-openssl-3.0.x"]');
    console.error('   Puis relancez : pnpm --filter api exec prisma generate');
    process.exit(1);
  }
}

build().catch((err) => {
  console.error(err);
  process.exit(1);
});
