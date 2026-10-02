import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as crypto from 'crypto';

// Catalogue des événements disponibles
export const WEBHOOK_EVENTS = [
  // Réservations
  'reservation.created',
  'reservation.updated',
  'reservation.cancelled',
  'reservation.checked_in',
  'reservation.checked_out',
  // Clients
  'partner.created',
  'partner.updated',
  // Ventes
  'sale.completed',
  'pos.sale_completed',
  // Stock
  'stock.low',
  'stock.out',
  'stock.movement',
  // Paiement
  'payment.received',
  // Caisse
  'cash.session_opened',
  'cash.session_closed',
  // Support
  'ticket.created',
  'ticket.resolved',
];

@Injectable()
export class WebhooksService {
  constructor(private prisma: PrismaService) {}

  private isSuperAdmin(user: any) {
    return user.role === 'SUPER_ADMIN' && user.isOwner;
  }

  private async getOrgId(user: any): Promise<string> {
    if (!user.organizationId) throw new ForbiddenException('Organisation requise');
    return user.organizationId;
  }

  async findAll(user: any) {
    const where = this.isSuperAdmin(user) ? {} : { organizationId: await this.getOrgId(user) };
    return this.prisma.webhook.findMany({
      where,
      include: {
        organization: { select: { id: true, name: true, type: true } },
        _count: { select: { deliveries: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(user: any, data: any) {
    if (this.isSuperAdmin(user)) {
      throw new ForbiddenException('Le Super Admin ne peut pas créer de webhook pour un tenant. Utilisez l\'impersonation.');
    }
    const organizationId = await this.getOrgId(user);

    // Génère un secret HMAC pour signer les payloads
    const secret = 'whsec_' + crypto.randomBytes(24).toString('hex');

    return this.prisma.webhook.create({
      data: {
        name: data.name,
        url: data.url,
        secret,
        events: data.events || [],
        organizationId,
      },
    });
  }

  async update(user: any, id: string, data: any) {
    if (this.isSuperAdmin(user)) {
      throw new ForbiddenException('Le Super Admin ne peut pas modifier un webhook.');
    }
    const wh = await this.findOneScoped(user, id);
    return this.prisma.webhook.update({
      where: { id: wh.id },
      data: {
        name: data.name ?? undefined,
        url: data.url ?? undefined,
        events: data.events ?? undefined,
        isActive: data.isActive ?? undefined,
      },
    });
  }

  async remove(user: any, id: string) {
    if (this.isSuperAdmin(user)) {
      throw new ForbiddenException('Le Super Admin ne peut pas supprimer un webhook.');
    }
    const wh = await this.findOneScoped(user, id);
    return this.prisma.webhook.delete({ where: { id: wh.id } });
  }

  async test(user: any, id: string) {
    const wh = await this.findOneScoped(user, id);
    return this.deliver(wh.id, 'webhook.test', {
      message: 'Ceci est un test depuis NEXUS OS',
      timestamp: new Date().toISOString(),
      webhookId: wh.id,
    });
  }

  async getDeliveries(user: any, webhookId: string, take = 50) {
    const wh = await this.findOneScoped(user, webhookId);
    return this.prisma.webhookDelivery.findMany({
      where: { webhookId: wh.id },
      orderBy: { createdAt: 'desc' },
      take,
    });
  }

  async retryDelivery(user: any, deliveryId: string) {
    const delivery = await this.prisma.webhookDelivery.findUnique({
      where: { id: deliveryId },
      include: { webhook: true },
    });
    if (!delivery) throw new NotFoundException('Livraison introuvable');
    if (!this.isSuperAdmin(user) && delivery.webhook.organizationId !== user.organizationId) {
      throw new ForbiddenException('Accès refusé');
    }

    const payload = JSON.parse(delivery.payload);
    return this.deliver(delivery.webhookId, delivery.event, payload);
  }

  private async findOneScoped(user: any, id: string) {
    const wh = await this.prisma.webhook.findUnique({ where: { id } });
    if (!wh) throw new NotFoundException('Webhook introuvable');
    if (!this.isSuperAdmin(user) && wh.organizationId !== user.organizationId) {
      throw new ForbiddenException('Accès refusé');
    }
    return wh;
  }

  /**
   * Envoie un payload signé à l'URL du webhook.
   * Utilise fetch natif (Node 18+).
   */
  async deliver(webhookId: string, event: string, data: any) {
    const webhook = await this.prisma.webhook.findUnique({ where: { id: webhookId } });
    if (!webhook || !webhook.isActive) return null;

    const payload = JSON.stringify({
      event,
      timestamp: new Date().toISOString(),
      data,
    });

    // Signature HMAC SHA-256
    const signature = crypto
      .createHmac('sha256', webhook.secret)
      .update(payload)
      .digest('hex');

    const start = Date.now();
    let statusCode: number | null = null;
    let responseBody: string | null = null;
    let succeeded = false;
    let errorMessage: string | null = null;

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10_000);

      const res = await fetch(webhook.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Nexus-Event': event,
          'X-Nexus-Signature': `sha256=${signature}`,
          'X-Nexus-Delivery': crypto.randomUUID(),
          'User-Agent': 'Nexus-OS-Webhook/1.0',
        },
        body: payload,
        signal: controller.signal,
      });

      clearTimeout(timeout);
      statusCode = res.status;
      responseBody = (await res.text()).slice(0, 1000);
      succeeded = statusCode >= 200 && statusCode < 300;
    } catch (err: any) {
      errorMessage = err?.message || String(err);
      succeeded = false;
    }

    const durationMs = Date.now() - start;

    // Trace la livraison
    await this.prisma.webhookDelivery.create({
      data: {
        webhookId,
        event,
        payload,
        statusCode,
        responseBody,
        durationMs,
        succeeded,
        errorMessage,
      },
    });

    // Met à jour les stats du webhook
    await this.prisma.webhook.update({
      where: { id: webhookId },
      data: {
        lastTriggeredAt: new Date(),
        lastStatus: succeeded ? 'OK' : 'FAILED',
        failureCount: succeeded ? 0 : { increment: 1 },
      },
    });

    return { succeeded, statusCode, durationMs, errorMessage };
  }

  /**
   * Dispatch un événement à TOUS les webhooks actifs d'une org qui écoutent cet event.
   * Fire & forget : ne bloque jamais l'appelant.
   */
  async dispatch(organizationId: string, event: string, data: any) {
    try {
      const webhooks = await this.prisma.webhook.findMany({
        where: {
          organizationId,
          isActive: true,
          events: { has: event },
        },
      });

      // Parallel fire & forget
      webhooks.forEach((wh) => {
        this.deliver(wh.id, event, data).catch((err) => {
          console.error(`[Webhook ${wh.id}] deliver failed:`, err?.message);
        });
      });
    } catch (err) {
      console.error('[Webhooks.dispatch] failed:', err);
    }
  }
}
