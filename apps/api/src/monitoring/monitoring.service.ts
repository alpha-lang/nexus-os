import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import Redis from 'ioredis';

@Injectable()
export class MonitoringService {
  constructor(private prisma: PrismaService) {}

  private async checkDatabase() {
    const start = Date.now();
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return {
        status: 'ok',
        latencyMs: Date.now() - start,
        error: null as string | null,
      };
    } catch (e: any) {
      return {
        status: 'error',
        latencyMs: Date.now() - start,
        error: e?.message || String(e),
      };
    }
  }

  private async checkRedis() {
    const url = process.env.UPSTASH_REDIS_URL;
    if (!url || !url.startsWith('rediss://')) {
      return { status: 'disabled', latencyMs: 0, error: null as string | null };
    }

    const start = Date.now();
    let redis: Redis | null = null;
    try {
      redis = new Redis(url, {
        maxRetriesPerRequest: 2,
        connectTimeout: 5000,
        lazyConnect: true,
      });
      await redis.connect();
      await redis.ping();
      const latencyMs = Date.now() - start;
      await redis.quit();
      return { status: 'ok', latencyMs, error: null as string | null };
    } catch (e: any) {
      try { redis?.disconnect(); } catch { /* ignore */ }
      return {
        status: 'error',
        latencyMs: Date.now() - start,
        error: e?.message || String(e),
      };
    }
  }

  private getSystemInfo() {
    const mem = process.memoryUsage();
    const uptime = process.uptime();

    return {
      node: process.version,
      platform: process.platform,
      arch: process.arch,
      uptimeSec: Math.round(uptime),
      uptimeHuman: `${Math.floor(uptime / 3600)}h ${Math.floor((uptime % 3600) / 60)}m`,
      memory: {
        rssMb: Math.round(mem.rss / 1024 / 1024),
        heapUsedMb: Math.round(mem.heapUsed / 1024 / 1024),
        heapTotalMb: Math.round(mem.heapTotal / 1024 / 1024),
        externalMb: Math.round(mem.external / 1024 / 1024),
      },
      env: process.env.NODE_ENV || 'development',
      region: process.env.VERCEL_REGION || 'local',
      vercel: process.env.VERCEL === '1',
      commit: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) || 'dev',
    };
  }

  async getMetrics() {
    const [db, redis] = await Promise.all([
      this.checkDatabase(),
      this.checkRedis(),
    ]);

    return {
      timestamp: new Date().toISOString(),
      status: db.status === 'ok' && (redis.status === 'ok' || redis.status === 'disabled')
        ? 'healthy'
        : 'degraded',
      services: {
        database: db,
        redis,
      },
      system: this.getSystemInfo(),
    };
  }

  async getDataStats() {
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 86400000);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 86400000);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 86400000);

    const [
      totalOrgs, totalUsers, totalPartners, totalReservations,
      totalSales, totalMovements,
      newUsers24h, newUsers7d, newUsers30d,
      newOrgs30d, newResas30d, newSales30d,
      recentErrors,
    ] = await Promise.all([
      this.prisma.organization.count(),
      this.prisma.user.count(),
      this.prisma.partner.count(),
      this.prisma.reservation.count(),
      this.prisma.sale.count(),
      this.prisma.stockMovement.count(),

      this.prisma.user.count({ where: { createdAt: { gte: oneDayAgo } } }),
      this.prisma.user.count({ where: { createdAt: { gte: sevenDaysAgo } } }),
      this.prisma.user.count({ where: { createdAt: { gte: thirtyDaysAgo } } }),

      this.prisma.organization.count({ where: { createdAt: { gte: thirtyDaysAgo } } }),
      this.prisma.reservation.count({ where: { createdAt: { gte: thirtyDaysAgo } } }),
      this.prisma.sale.count({ where: { createdAt: { gte: thirtyDaysAgo } } }),

      this.prisma.auditLog.count({
        where: {
          createdAt: { gte: sevenDaysAgo },
          OR: [
            { action: { contains: 'ERROR' } },
            { action: { contains: '[ERROR]' } },
          ],
        },
      }),
    ]);

    return {
      timestamp: now.toISOString(),
      totals: {
        organizations: totalOrgs,
        users: totalUsers,
        partners: totalPartners,
        reservations: totalReservations,
        sales: totalSales,
        stockMovements: totalMovements,
      },
      activity: {
        users: { d1: newUsers24h, d7: newUsers7d, d30: newUsers30d },
        organizations30d: newOrgs30d,
        reservations30d: newResas30d,
        sales30d: newSales30d,
      },
      errors: {
        recent7d: recentErrors,
      },
    };
  }
}
