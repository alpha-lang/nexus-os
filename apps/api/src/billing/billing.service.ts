import { Injectable, NotFoundException } from '@nestjs/common';
import type { Response } from 'express';
import { PrismaService } from '../prisma/prisma.service';
import { resolvePrice } from '../modules/pricing.util';

@Injectable()
export class BillingService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.payment.findMany({
      include: {
        organization: { select: { id: true, name: true } },
        subscription: { select: { id: true, status: true } },
      },
      orderBy: { date: 'desc' },
    });
  }

  async findByOrganization(organizationId: string) {
    return this.prisma.payment.findMany({
      where: { organizationId },
      include: { subscription: true },
      orderBy: { date: 'desc' },
    });
  }

  async createForSubscription(subscriptionId: string, organizationId: string) {
    const subscription = await this.prisma.subscription.findUnique({
      where: { id: subscriptionId },
      include: {
        activeModules: { include: { module: true } },
        organization: { select: { type: true } },
      },
    });

    if (!subscription) throw new NotFoundException('Abonnement introuvable');

    let totalAmount = 0;
    for (const am of subscription.activeModules) {
      if (am.isActive) {
        totalAmount += resolvePrice(am.module, subscription.organization?.type);
      }
    }

    if (totalAmount === 0) {
      return null;
    }

    // Éviter les doublons : on vérifie si une facture PAID existe déjà pour ce mois
    const existingPaid = await this.prisma.payment.findFirst({
      where: {
        subscriptionId,
        status: 'PAID',
        date: {
          gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
        },
      },
    });

    if (existingPaid) {
      return existingPaid;
    }

    let periodLabel = 'mois';
    if (subscription.billingPeriod === 'QUARTERLY') {
      periodLabel = 'trimestre';
    } else if (subscription.billingPeriod === 'ANNUAL') {
      periodLabel = 'an';
    }

    return this.prisma.payment.create({
      data: {
        organizationId,
        subscriptionId,
        amount: totalAmount,
        method: 'NOT_PAID_YET',
        status: 'PENDING',
        note: `Facture automatique - ${periodLabel}`,
        date: new Date(),
      },
    });
  }

  async markAsPaid(id: string) {
    const payment = await this.prisma.payment.findUnique({ where: { id } });
    if (!payment) throw new NotFoundException('Paiement introuvable');
    return this.prisma.payment.update({
      where: { id },
      data: { status: 'PAID' },
    });
  }

  async remove(id: string) {
    const payment = await this.prisma.payment.findUnique({ where: { id } });
    if (!payment) throw new NotFoundException('Paiement introuvable');
    return this.prisma.payment.delete({ where: { id } });
  }

  // ═══════════════════════════════════════════════════════════
  //  EXPORT COMPTABLE — CSV format expert-comptable
  // ═══════════════════════════════════════════════════════════

  async exportAccounting(res: Response, user: any) {
    const payments = await this.prisma.payment.findMany({
      include: {
        organization: { select: { name: true, slug: true } },
        subscription: { select: { id: true, billingPeriod: true } },
      },
      orderBy: { date: 'asc' },
    });

    // Récupérer les BillingConfig pour NIF
    const configs = await this.prisma.billingConfig.findMany({
      select: { organizationId: true, taxId: true, legalName: true },
    });
    const configByOrg = new Map(configs.map((c) => [c.organizationId, c]));

    const headers = [
      'N° facture',
      'Date',
      'Organisation',
      'NIF',
      'HT (Ar)',
      'TVA (Ar)',
      'TTC (Ar)',
      'Statut',
      'Méthode',
      'Période',
      'Note',
    ];

    const rows = payments.map((p, i) => {
      const config = configByOrg.get(p.organizationId);
      const year = new Date(p.date).getFullYear();
      const invoiceNumber = `FAC-${year}-${String(i + 1).padStart(4, '0')}`;
      const ttc = p.amount || 0;
      const vatRate = 0.20;
      const ht = ttc / (1 + vatRate);
      const vat = ttc - ht;

      return [
        invoiceNumber,
        new Date(p.date).toLocaleDateString('fr-FR'),
        config?.legalName || p.organization?.name || '',
        config?.taxId || '',
        Math.round(ht).toString(),
        Math.round(vat).toString(),
        Math.round(ttc).toString(),
        p.status || 'PENDING',
        p.method || '',
        p.subscription?.billingPeriod || '',
        (p.note || '').replace(/[;\n]/g, ' ').slice(0, 100),
      ];
    });

    // CSV avec séparateur ';' (format français Excel)
    const csv = [headers, ...rows]
      .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(';'))
      .join('\n');

    const filename = `export-comptable-${new Date().toISOString().slice(0, 10)}.csv`;

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send('\ufeff' + csv);
  }
}
