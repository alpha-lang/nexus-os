import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log'],
  });

  app.enableCors({
    origin: true,        // à restreindre plus tard à ton domaine front
    credentials: true,
  });

  const port = process.env.PORT ?? 3001;
  await app.listen(port, '0.0.0.0');
  console.log(`🚀 NEXUS API démarrée sur le port ${port}`);
}

bootstrap().catch((err) => {
  console.error('❌ Erreur au démarrage:', err);
  process.exit(1);
});
