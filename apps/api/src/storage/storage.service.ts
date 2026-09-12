import { Injectable, NotFoundException } from '@nestjs/common';
import type { Response } from 'express';
import { PrismaService } from '../prisma.service';
import { BYTES, fmtBytes } from './storage.util';

@Injectable()
export class StorageService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.storageQuota.findMany({
      include: {
        organization: {
          select: {
            id: true,
            name: true,
            subscriptions: {
              select: {
                id: true,
                billingPeriod: true,
                payments: { orderBy: { date: 'desc' }, take: 1 },
              },
            },
          },
        },
      },
      orderBy: { organizationId: 'asc' },
    });
  }

  async findByOrganization(organizationId: string) {
    return this.prisma.storageQuota.findUnique({
      where: { organizationId },
      include: { organization: true },
    });
  }

  async upsert(data: any) {
    const organization = await this.prisma.organization.findUnique({
      where: { id: data.organizationId },
    });
    if (!organization) throw new NotFoundException('Organisation introuvable');

    return this.prisma.storageQuota.upsert({
      where: { organizationId: data.organizationId },
      update: {
        usedStorage: data.usedStorage ?? undefined,
        maxStorage: data.maxStorage ?? undefined,
        lastBackup: data.lastBackup ? new Date(data.lastBackup) : undefined,
      },
      create: {
        organizationId: data.organizationId,
        usedStorage: data.usedStorage || 0,
        maxStorage: data.maxStorage || 500,
        lastBackup: data.lastBackup ? new Date(data.lastBackup) : null,
      },
    });
  }

  async updateUsage(organizationId: string, usedStorage: number) {
    const quota = await this.findByOrganization(organizationId);
    if (!quota) throw new NotFoundException('Quota non trouvé');
    return this.prisma.storageQuota.update({
      where: { organizationId },
      data: { usedStorage },
    });
  }

  async recordBackup(organizationId: string) {
    const quota = await this.findByOrganization(organizationId);
    if (!quota) throw new NotFoundException('Quota non trouvé');

    // Calcul du volume RÉEL estimé
    const realSize = await this.computeOrgSize(organizationId);

    await this.prisma.backup.create({
      data: {
        organizationId,
        fileName: `backup-${new Date().toISOString().slice(0,10)}-${Date.now()}.sql`,
        fileSize: realSize.bytes,
        status: 'COMPLETED',
      },
    });

    return this.prisma.storageQuota.update({
      where: { organizationId },
      data: {
        lastBackup: new Date(),
        usedStorage: realSize.bytes / (1024 * 1024),
      },
    });
  }

  /**
   * Calcule le volume estimé d'une organisation à partir des counts.
   */
  async computeOrgSize(organizationId: string) {
    const [
      users, customers, customerNotes, customerDocs,
      reservations, folioCharges, housekeeping,
      rooms, roomTypes,
      menuItems, tables, orders, orderItems, orderPayments,
      cashRegisters, cashMovements, cashSessions,
      sales, catalogItems,
    ] = await Promise.all([
      this.prisma.user.count({ where: { organizationId } }),
      this.prisma.partner.count({ where: { organizationId, type: 'CUSTOMER' } }),
      this.prisma.customerNote.count({ where: { customer: { organizationId } } }),
      this.prisma.customerDocument.count({ where: { customer: { organizationId } } }),
      this.prisma.reservation.count({ where: { organizationId } }),
      this.prisma.folioCharge.count({ where: { organizationId } }),
      this.prisma.housekeepingTask.count({ where: { organizationId } }),
      this.prisma.room.count({ where: { organizationId } }),
      this.prisma.roomType.count({ where: { organizationId } }),
      this.prisma.menuItem.count({ where: { organizationId } }),
      this.prisma.table.count({ where: { organizationId } }),
      this.prisma.restaurantOrder.count({ where: { organizationId } }),
      this.prisma.restaurantOrderItem.count({ where: { order: { organizationId } } }),
      this.prisma.orderPayment.count({ where: { order: { organizationId } } }),
      this.prisma.cashRegister.count({ where: { organizationId } }),
      this.prisma.cashMovement.count({ where: { organizationId } }),
      this.prisma.cashSession.count({ where: { organizationId } }),
      this.prisma.sale.count({ where: { organizationId } }),
      this.prisma.catalogItem.count({ where: { organizationId } }),
    ]);

    const bytes =
      users * BYTES.user +
      customers * BYTES.customer +
      customerNotes * BYTES.customerNote +
      customerDocs * BYTES.customerDocument +
      reservations * BYTES.reservation +
      folioCharges * BYTES.folioCharge +
      housekeeping * BYTES.housekeeping +
      rooms * BYTES.room +
      roomTypes * BYTES.roomType +
      menuItems * BYTES.menuItem +
      tables * BYTES.table +
      orders * BYTES.restaurantOrder +
      orderItems * BYTES.restaurantOrderItem +
      orderPayments * BYTES.orderPayment +
      cashRegisters * BYTES.cashRegister +
      cashMovements * BYTES.cashMovement +
      cashSessions * BYTES.cashSession +
      sales * BYTES.sale +
      catalogItems * BYTES.catalogItem;

    return {
      ...fmtBytes(bytes),
      breakdown: {
        users, customers, customerNotes, customerDocs,
        reservations, folioCharges, housekeeping,
        rooms, roomTypes,
        menuItems, tables, orders, orderItems, orderPayments,
        cashRegisters, cashMovements, cashSessions,
        sales, catalogItems,
      },
    };
  }

  /**
   * Recalcule et met à jour usedStorage pour toutes les organisations.
   */
  async recalcAll() {
    const orgs = await this.prisma.organization.findMany({ select: { id: true, name: true } });
    const results: any[] = [];
    for (const o of orgs) {
      const r = await this.computeOrgSize(o.id);
      try {
        // upsert : crée le quota s'il n'existe pas
        await this.prisma.storageQuota.upsert({
          where: { organizationId: o.id },
          update: { usedStorage: r.bytes / (1024 * 1024) },
          create: {
            organizationId: o.id,
            usedStorage: r.bytes / (1024 * 1024),
            maxStorage: o.name.includes('CORP') ? 10000 : 500,
          },
        });
        results.push({ organizationId: o.id, name: o.name, saved: true, ...r });
      } catch (e: any) {
        results.push({ organizationId: o.id, name: o.name, saved: false, error: e.message, ...r });
      }
    }
    return results;
  }

  async getAllBackups() {
    return this.prisma.backup.findMany({
      include: { organization: { select: { id: true, name: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getBackups(organizationId: string) {
    return this.prisma.backup.findMany({
      where: { organizationId },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Génère un dump SQL de l'organisation et l'envoie comme fichier
   * téléchargeable.
   */
  async downloadBackup(id: string, res: Response) {
    const backup = await this.prisma.backup.findUnique({
      where: { id },
      include: { organization: true },
    });
    if (!backup) throw new NotFoundException('Sauvegarde introuvable');

    const orgId = backup.organizationId;

    const [org, users, customers, modules, sales, subscriptions] = await Promise.all([
      this.prisma.organization.findUnique({ where: { id: orgId } }),
      this.prisma.user.findMany({ where: { organizationId: orgId } }),
      this.prisma.partner.findMany({ where: { organizationId: orgId, type: 'CUSTOMER' } }),
      this.prisma.module.findMany({ where: { organizationId: orgId } }),
      this.prisma.sale.findMany({ where: { organizationId: orgId } }),
      this.prisma.subscription.findMany({ where: { organizationId: orgId } }),
    ]);

    const esc = (v: any) => {
      if (v === null || v === undefined) return 'NULL';
      if (typeof v === 'number') return v.toString();
      if (typeof v === 'boolean') return v ? 'TRUE' : 'FALSE';
      if (v instanceof Date) return `'${v.toISOString()}'`;
      return `'${String(v).replace(/'/g, "''")}'`;
    };

    const lines: string[] = [];
    lines.push(`-- ============================================`);
    lines.push(`-- NEXUS OS - Sauvegarde SQL`);
    lines.push(`-- Organisation : ${backup.organization?.name}`);
    lines.push(`-- Généré le     : ${new Date().toISOString()}`);
    lines.push(`-- Backup ID     : ${backup.id}`);
    lines.push(`-- ============================================`);
    lines.push('');
    lines.push('BEGIN;');
    lines.push('');

    if (org) {
      lines.push('-- Organization');
      lines.push(
        `INSERT INTO "Organization" (id, name, slug, type, city, email, phone, description, status) VALUES (` +
          `${esc(org.id)}, ${esc(org.name)}, ${esc(org.slug)}, ${esc(org.type)}, ${esc(org.city)}, ` +
          `${esc(org.email)}, ${esc(org.phone)}, ${esc(org.description)}, ${esc(org.status)});`
      );
      lines.push('');
    }

    if (users.length) {
      lines.push('-- Users');
      for (const u of users) {
        lines.push(
          `INSERT INTO "User" (id, email, name, role, "organizationId", "isActive", "isOwner") VALUES (` +
            `${esc(u.id)}, ${esc(u.email)}, ${esc(u.name)}, ${esc(u.role)}, ${esc(u.organizationId)}, ` +
            `${esc(u.isActive)}, ${esc(u.isOwner)});`
        );
      }
      lines.push('');
    }

    if (customers.length) {
      lines.push('-- Customers');
      for (const c of customers) {
        lines.push(
          `INSERT INTO "Customer" (id, "firstName", "lastName", email, phone, address, city, "organizationId") VALUES (` +
            `${esc(c.id)}, ${esc(c.firstName)}, ${esc(c.lastName)}, ${esc(c.email)}, ${esc(c.phone)}, ` +
            `${esc(c.address)}, ${esc(c.city)}, ${esc(c.organizationId)});`
        );
      }
      lines.push('');
    }

    if (modules.length) {
      lines.push('-- Modules');
      for (const m of modules) {
        lines.push(
          `INSERT INTO "Module" (id, name, types, description, price, status, route, "organizationId") VALUES (` +
            `${esc(m.id)}, ${esc(m.name)}, ${esc(m.types)}, ${esc(m.description)}, ${esc(m.price)}, ` +
            `${esc(m.status)}, ${esc(m.route)}, ${esc(m.organizationId)});`
        );
      }
      lines.push('');
    }

    if (subscriptions.length) {
      lines.push('-- Subscriptions');
      for (const s of subscriptions) {
        lines.push(
          `INSERT INTO "Subscription" (id, "organizationId", status, "startDate", "endDate", "billingPeriod") VALUES (` +
            `${esc(s.id)}, ${esc(s.organizationId)}, ${esc(s.status)}, ${esc(s.startDate)}, ` +
            `${esc(s.endDate)}, ${esc(s.billingPeriod)});`
        );
      }
      lines.push('');
    }

    if (sales.length) {
      lines.push('-- Sales');
      for (const s of sales) {
        lines.push(
          `INSERT INTO "Sale" (id, "customerId", "moduleId", "catalogItemId", quantity, total, "organizationId") VALUES (` +
            `${esc(s.id)}, ${esc(s.customerId)}, ${esc(s.moduleId)}, ${esc(s.catalogItemId)}, ` +
            `${esc(s.quantity)}, ${esc(s.total)}, ${esc(s.organizationId)});`
        );
      }
      lines.push('');
    }

    lines.push('COMMIT;');
    lines.push('');

    const sql = lines.join('\n');

    res.setHeader('Content-Type', 'application/sql; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${backup.fileName}"`,
    );
    res.send(sql);
  }
}
