import { ThrottlerModuleOptions } from '@nestjs/throttler';
import { ThrottlerStorageRedisService } from 'nestjs-throttler-storage-redis';
import { Logger } from '@nestjs/common';
import Redis from 'ioredis';

export function createThrottlerConfig(): ThrottlerModuleOptions {
  const url = process.env.UPSTASH_REDIS_URL;
  const isDev = process.env.NODE_ENV !== 'production';

  // Un seul throttler global : large, pour éviter les abus accidentels.
  // Les routes sensibles (login, refresh) override avec un @Throttle plus strict.
  const throttlers = [
    {
      name: 'default',
      ttl: 60_000,        // fenêtre : 1 minute
      limit: isDev ? 100_000 : 300,  // 300 req/min en prod, illimité en dev
      skipIf: () => isDev,
    },
  ];

  if (url && url.startsWith('rediss://')) {
    Logger.log('🔒 Rate limiting : Redis Upstash (TCP TLS)', 'Throttler');

    const redis = new Redis(url, {
      maxRetriesPerRequest: 3,
      enableReadyCheck: false,
      lazyConnect: false,
      retryStrategy: (times) => Math.min(times * 200, 2000),
    });

    redis.on('error', (err) => Logger.error(`Redis: ${err.message}`, 'Throttler'));
    redis.on('connect', () => Logger.log('✅ Redis connecté', 'Throttler'));

    if (isDev) Logger.warn('⚠️  Throttler désactivé en dev', 'Throttler');

    return {
      throttlers,
      storage: new ThrottlerStorageRedisService(redis),
    };
  }

  Logger.warn('⚠️  Rate limiting en mémoire (dev only)', 'Throttler');
  return { throttlers };
}
