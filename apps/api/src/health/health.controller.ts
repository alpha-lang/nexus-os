import { Controller, Get } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Controller('health')
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async check() {
    const start = Date.now();
    let dbStatus = 'ok';
    let dbLatency = 0;
    let dbError: string | null = null;

    try {
      const dbStart = Date.now();
      await this.prisma.$queryRaw`SELECT 1`;
      dbLatency = Date.now() - dbStart;
    } catch (e) {
      dbStatus = 'error';
      dbError = e instanceof Error ? e.message : String(e);
    }

    const uptime = process.uptime();

    return {
      status: dbStatus === 'ok' ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString(),
      uptime: Math.round(uptime),
      uptimeHuman: `${Math.floor(uptime / 3600)}h ${Math.floor((uptime % 3600) / 60)}m`,
      version: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) || 'dev',
      region: process.env.VERCEL_REGION || 'local',
      node: process.version,
      responseTimeMs: Date.now() - start,
      checks: {
        database: {
          status: dbStatus,
          latencyMs: dbLatency,
          error: dbError,
        },
      },
    };
  }
}
