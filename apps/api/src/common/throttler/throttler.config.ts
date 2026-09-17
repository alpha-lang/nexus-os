import { ThrottlerModuleOptions } from '@nestjs/throttler';
import { ThrottlerStorageRedisService } from 'nestjs-throttler-storage-redis';
import { Logger } from '@nestjs/common';
import Redis from 'ioredis';

export function createThrottlerConfig(): ThrottlerModuleOptions {
  const url = process.env.UPSTASH_REDIS_URL;

  const throttlers = [
    { name: 'default', ttl: 60_000, limit: 100 },
    { name: 'auth', ttl: 900_000, limit: 5 },
  ];

  if (url && url.startsWith('rediss://')) {
    Logger.log('🔒 Rate limiting : Redis Upstash (TCP TLS)', 'Throttler');

    const redis = new Redis(url, {
      maxRetriesPerRequest: 3,
      enableReadyCheck: false,
      lazyConnect: false,
      retryStrategy: (times) => Math.min(times * 200, 2000),
    });

    redis.on('error', (err) =>
      Logger.error(`Redis: ${err.message}`, 'Throttler'),
    );
    redis.on('connect', () =>
      Logger.log('✅ Redis connecté', 'Throttler'),
    );

    return {
      throttlers,
      storage: new ThrottlerStorageRedisService(redis),
    };
  }

  Logger.warn(
    '⚠️  Rate limiting en mémoire (dev only, PAS pour Vercel)',
    'Throttler',
  );
  return { throttlers };
}
