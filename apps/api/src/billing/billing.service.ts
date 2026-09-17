import { Injectable, NotFoundException } from '@nestjs/common';
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
}
