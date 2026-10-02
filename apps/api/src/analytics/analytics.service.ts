import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { resolvePrice } from '../modules/pricing.util';

@Injectable()
export class AnalyticsService {
  constructor(private prisma: PrismaService) {}

  async getRevenueAnalytics() {
    const now = new Date();
    const start12m = new Date(now.getFullYear(), now.getMonth() - 11, 1);

    // ═══ 1. Toutes les subscriptions actives avec modules ═══
    const activeSubs = await this.prisma.subscription.findMany({
      where: {
        status: 'ACTIVE',
        organization: { type: { not: 'INTERNE' } },
      },
      include: {
        activeModules: { include: { module: true } },
        organization: {
          select: { id: true, name: true, type: true, city: true, createdAt: true },
        },
      },
    });

    // ═══ 2. Calcul MRR par org ═══
    const orgsWithRevenue = activeSubs.map((sub) => {
      const orgType = sub.organization?.type;
      const mrr = (sub.activeModules || [])
        .filter((am) => am.isActive)
        .reduce((s, am) => s + resolvePrice(am.module, orgType), 0);

      const moduleBreakdown = (sub.activeModules || [])
        .filter((am) => am.isActive)
        .map((am) => ({
          moduleId: am.module.id,
          moduleName: am.module.name,
          price: resolvePrice(am.module, orgType),
        }));

      return {
        orgId: sub.organization.id,
        orgName: sub.organization.name,
        orgType: sub.organization.type,
        orgCity: sub.organization.city,
        orgCreatedAt: sub.organization.createdAt,
        mrr,
        modules: moduleBreakdown,
      };
    });

    // ═══ 3. MRR par plan ═══
    // Calculé en fonction du nombre de modules souscrits :
    // 0-1 = Starter, 2-3 = Standard, 4-5 = Pro, 6+ = Enterprise
    const planMap = { Starter: 0, Standard: 0, Pro: 0, Enterprise: 0 };
    const planCount = { Starter: 0, Standard: 0, Pro: 0, Enterprise: 0 };
    for (const org of orgsWithRevenue) {
      const n = org.modules.length;
      const plan = n >= 6 ? 'Enterprise' : n >= 4 ? 'Pro' : n >= 2 ? 'Standard' : 'Starter';
      planMap[plan] += org.mrr;
      planCount[plan]++;
    }

    const byPlan = Object.entries(planMap).map(([plan, mrr]) => ({
      plan,
      mrr,
      count: planCount[plan as keyof typeof planCount],
      arr: mrr * 12,
    }));

    // ═══ 4. MRR par type d'org ═══
    const typeMap: Record<string, { mrr: number; count: number }> = {};
    for (const org of orgsWithRevenue) {
      const t = org.orgType || 'AUTRE';
      if (!typeMap[t]) typeMap[t] = { mrr: 0, count: 0 };
      typeMap[t].mrr += org.mrr;
      typeMap[t].count++;
    }
    const byType = Object.entries(typeMap).map(([type, data]) => ({
      type,
      mrr: data.mrr,
      count: data.count,
      arr: data.mrr * 12,
      arpu: data.count > 0 ? Math.round(data.mrr / data.count) : 0,
    })).sort((a, b) => b.mrr - a.mrr);

    // ═══ 5. MRR par module ═══
    const moduleMap: Record<string, { name: string; mrr: number; subscribers: number }> = {};
    for (const org of orgsWithRevenue) {
      for (const m of org.modules) {
        if (!moduleMap[m.moduleId]) {
          moduleMap[m.moduleId] = { name: m.moduleName, mrr: 0, subscribers: 0 };
        }
        moduleMap[m.moduleId].mrr += m.price;
        moduleMap[m.moduleId].subscribers++;
      }
    }
    const byModule = Object.values(moduleMap).sort((a, b) => b.mrr - a.mrr);

    // ═══ 6. Revenus 12 mois (paiements encaissés) ═══
    const monthlyPayments = await this.prisma.$queryRaw<{ m: Date; total: number; count: bigint }[]>`
      SELECT date_trunc('month', p.date) AS m,
             COALESCE(SUM(p.amount), 0)::float AS total,
             COUNT(*)::bigint AS count
      FROM "Payment" p
      JOIN "Organization" o ON o.id = p."organizationId"
      WHERE p.date >= ${start12m}
        AND p.status = 'PAID'
        AND o.type <> 'INTERNE'
      GROUP BY 1
      ORDER BY 1
    `;

    const byMonthMap = new Map<string, { revenue: number; count: number }>();
    for (const r of monthlyPayments) {
      const d = new Date(r.m);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      byMonthMap.set(key, { revenue: Number(r.total) || 0, count: Number(r.count) || 0 });
    }

    const monthlyRevenue: { month: string; label: string; revenue: number; count: number }[] = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const data = byMonthMap.get(key) || { revenue: 0, count: 0 };
      monthlyRevenue.push({
        month: key,
        label: d.toLocaleDateString('fr-FR', { month: 'short' }),
        revenue: data.revenue,
        count: data.count,
      });
    }

    // ═══ 7. Prévision 3 mois (moyenne 3 derniers mois) ═══
    const last3 = monthlyRevenue.slice(-3).map((m) => m.revenue);
    const avgLast3 = last3.reduce((s, r) => s + r, 0) / 3 || 0;
    const forecast = [1, 2, 3].map((i) => {
      const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
      return {
        month: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
        label: d.toLocaleDateString('fr-FR', { month: 'short' }),
        revenue: Math.round(avgLast3),
      };
    });

    // ═══ 8. Top 20 clients par MRR ═══
    const topClients = [...orgsWithRevenue]
      .sort((a, b) => b.mrr - a.mrr)
      .slice(0, 20)
      .map((o) => ({
        orgId: o.orgId,
        name: o.orgName,
        type: o.orgType,
        city: o.orgCity,
        mrr: o.mrr,
        modulesCount: o.modules.length,
        plan: o.modules.length >= 6 ? 'Enterprise' : o.modules.length >= 4 ? 'Pro' : o.modules.length >= 2 ? 'Standard' : 'Starter',
      }));

    // ═══ 9. Totaux ═══
    const mrr = orgsWithRevenue.reduce((s, o) => s + o.mrr, 0);
    const arr = mrr * 12;

    return {
      generatedAt: now.toISOString(),
      totals: {
        mrr,
        arr,
        totalClients: orgsWithRevenue.length,
        payingClients: orgsWithRevenue.filter((o) => o.mrr > 0).length,
        arpu: orgsWithRevenue.length > 0 ? Math.round(mrr / orgsWithRevenue.length) : 0,
      },
      byPlan,
      byType,
      byModule,
      monthlyRevenue,
      forecast,
      topClients,
    };
  }
}
