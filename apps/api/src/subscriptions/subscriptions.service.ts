import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { resolvePrice } from '../modules/pricing.util';
import { BillingService } from '../billing/billing.service';

@Injectable()
export class SubscriptionsService {
  constructor(
    private prisma: PrismaService,
    private billingService: BillingService,
  ) {}

  async findAll() {
    return this.prisma.subscription.findMany({
      include: {
        organization: {
          select: { id: true, name: true, type: true, storageQuota: true },
        },
        activeModules: { include: { module: true } },
        payments: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const subscription = await this.prisma.subscription.findUnique({
      where: { id },
      include: {
        organization: {
          select: { id: true, name: true, type: true, storageQuota: true },
        },
        activeModules: { include: { module: true } },
        payments: true,
      },
    });
    if (!subscription) throw new NotFoundException('Abonnement introuvable');
    return subscription;
  }

  async findOrganizationsWithoutSubscription() {
    return this.prisma.organization.findMany({
      where: {
        subscriptions: { none: { status: { in: ['ACTIVE', 'TRIAL', 'SUSPENDED'] } } },
      },
      orderBy: { name: 'asc' },
    });
  }

  async create(data: any) {
    const organization = await this.prisma.organization.findUnique({
      where: { id: data.organizationId },
    });
    if (!organization) throw new NotFoundException('Organisation introuvable');

    const existing = await this.prisma.subscription.findFirst({
      where: { organizationId: data.organizationId },
    });
    if (existing && existing.status !== 'EXPIRED') {
      throw new BadRequestException('Un abonnement est déjà actif pour cette organisation');
    }

    const billingPeriod = data.billingPeriod || 'MONTHLY';
    const endDate = data.endDate ? new Date(data.endDate) : null;
    const status = data.status || 'TRIAL';

    let subscription;
    if (existing) {
      subscription = await this.prisma.subscription.update({
        where: { id: existing.id },
        data: { status, startDate: new Date(), endDate, billingPeriod },
      });
      await this.prisma.subscriptionModule.deleteMany({
        where: { subscriptionId: subscription.id },
      });
      await this.prisma.payment.deleteMany({
        where: { subscriptionId: subscription.id, status: 'PENDING' },
      });
    } else {
      subscription = await this.prisma.subscription.create({
        data: {
          organizationId: data.organizationId,
          status,
          startDate: new Date(),
          endDate,
          billingPeriod,
        },
      });
    }

    if (data.moduleIds && Array.isArray(data.moduleIds)) {
      for (const moduleId of data.moduleIds) {
        const module = await this.prisma.module.findUnique({ where: { id: moduleId } });
        if (!module) throw new NotFoundException(`Module ${moduleId} introuvable`);
        await this.prisma.subscriptionModule.create({
          data: { subscriptionId: subscription.id, moduleId, isActive: true },
        });
      }
    }

    const quotaPrice = parseFloat(data.quotaPrice) || 0;
    if (data.maxStorage) {
      await this.prisma.storageQuota.upsert({
        where: { organizationId: data.organizationId },
        update: { maxStorage: data.maxStorage },
        create: {
          organizationId: data.organizationId,
          maxStorage: data.maxStorage,
          usedStorage: 0,
        },
      });
    }

    // Charger le type d'organisation pour appliquer le bon prix
    const org = await this.prisma.organization.findUnique({
      where: { id: data.organizationId },
      select: { type: true },
    });

    let totalModules = 0;
    if (data.moduleIds && Array.isArray(data.moduleIds)) {
      for (const moduleId of data.moduleIds) {
        const module = await this.prisma.module.findUnique({ where: { id: moduleId } });
        if (module) totalModules += resolvePrice(module, org?.type);
      }
    }
    const totalAmount = totalModules + quotaPrice;

    // Facturation uniquement si le statut est ACTIVE
    if (status === 'ACTIVE' && totalAmount > 0) {
      await this.prisma.payment.create({
        data: {
          organizationId: data.organizationId,
          subscriptionId: subscription.id,
          amount: totalAmount,
          method: 'NOT_PAID_YET',
          status: 'PENDING',
          note: `Facture - ${billingPeriod} (Modules ${totalModules} + Quota ${quotaPrice})`,
          date: new Date(),
        },
      });
    }

    return this.prisma.subscription.findUnique({
      where: { id: subscription.id },
      include: {
        organization: {
          select: { id: true, name: true, type: true, storageQuota: true },
        },
        activeModules: { include: { module: true } },
        payments: true,
      },
    });
  }

  async update(id: string, data: any) {
    await this.findOne(id);
    return this.prisma.subscription.update({
      where: { id },
      data: {
        status: data.status ?? undefined,
        endDate: data.endDate ? new Date(data.endDate) : undefined,
        billingPeriod: data.billingPeriod ?? undefined,
      },
    });
  }

  async activateModule(subscriptionId: string, moduleId: string) {
    await this.findOne(subscriptionId);
    const module = await this.prisma.module.findUnique({ where: { id: moduleId } });
    if (!module) throw new NotFoundException('Module introuvable');

    const existing = await this.prisma.subscriptionModule.findFirst({
      where: { subscriptionId, moduleId },
    });
    if (existing) {
      return this.prisma.subscriptionModule.update({
        where: { id: existing.id },
        data: { isActive: true },
      });
    }
    return this.prisma.subscriptionModule.create({
      data: { subscriptionId, moduleId, isActive: true },
    });
  }

  async deactivateModule(subscriptionId: string, moduleId: string) {
    const existing = await this.prisma.subscriptionModule.findFirst({
      where: { subscriptionId, moduleId },
    });
    if (!existing) throw new NotFoundException('Module non trouvé');
    return this.prisma.subscriptionModule.update({
      where: { id: existing.id },
      data: { isActive: false },
    });
  }

  async activate(id: string) {
    await this.findOne(id);
    const subscription = await this.prisma.subscription.update({
      where: { id },
      data: { status: 'ACTIVE', startDate: new Date(), endDate: null },
    });
    await this.prisma.payment.deleteMany({
      where: { subscriptionId: id, status: 'PENDING' },
    });
    await this.billingService.createForSubscription(id, subscription.organizationId);
    return subscription;
  }

  async suspend(id: string) {
    await this.findOne(id);
    return this.prisma.subscription.update({
      where: { id },
      data: { status: 'SUSPENDED' },
    });
  }

  async expire(id: string) {
    await this.findOne(id);
    return this.prisma.subscription.update({
      where: { id },
      data: { status: 'EXPIRED' },
    });
  }
}
