import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PurchaseOrdersService {
  constructor(private prisma: PrismaService) {}

  private async getOrganizationId(user: any): Promise<string> {
    if (user.organizationId) return user.organizationId;
    throw new ForbiddenException("Reserve aux utilisateurs d'une organisation.");
  }

  private canWrite(user: any): boolean {
    return (user.role === 'SUPER_ADMIN' && user.isOwner) ||
      ['ADMIN', 'MANAGER', 'STOCK_MANAGER', 'FINANCE'].includes(user.role);
  }

  private async generateReference(orgId: string): Promise<string> {
    const year = new Date().getFullYear();
    const count = await this.prisma.purchaseOrder.count({ where: { organizationId: orgId } });
    return `PO-${year}-${String(count + 1).padStart(4, '0')}`;
  }

  // ═══════════════════════════════════════════════════════
  //  LIST
  // ═══════════════════════════════════════════════════════
  async findAll(user: any, filters: any) {
    const orgId = await this.getOrganizationId(user);
    const where: any = { organizationId: orgId };
    if (filters.status) where.status = filters.status;
    if (filters.supplierId) where.supplierId = filters.supplierId;

    return this.prisma.purchaseOrder.findMany({
      where,
      include: {
        supplier: { select: { id: true, name: true, leadTimeDays: true } },
        createdBy: { select: { id: true, name: true, email: true } },
        _count: { select: { items: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
  }

  async findOne(user: any, id: string) {
    const orgId = await this.getOrganizationId(user);
    const order = await this.prisma.purchaseOrder.findFirst({
      where: { id, organizationId: orgId },
      include: {
        supplier: true,
        createdBy: { select: { id: true, name: true, email: true } },
        items: {
          include: {
            stockItem: { select: { id: true, name: true, sku: true, unit: true, currentStock: true } },
          },
        },
      },
    });
    if (!order) throw new NotFoundException('Commande introuvable');
    return order;
  }

  // ═══════════════════════════════════════════════════════
  //  CREATE
  // ═══════════════════════════════════════════════════════
  async create(user: any, data: any) {
    if (!this.canWrite(user)) throw new ForbiddenException('Acces refuse');
    const orgId = await this.getOrganizationId(user);

    if (!data.supplierId) throw new BadRequestException('Fournisseur requis');
    if (!data.items || data.items.length === 0) throw new BadRequestException('Au moins un article requis');

    const supplier = await this.prisma.partner.findFirst({
      where: { id: data.supplierId, organizationId: orgId, type: 'SUPPLIER' },
    });
    if (!supplier) throw new NotFoundException('Fournisseur introuvable');

    const reference = await this.generateReference(orgId);

    // Calcul totaux + resolution costPrice si absent
    let totalAmount = 0;
    const itemsToCreate: any[] = [];
    for (const it of data.items) {
      const stockItem = await this.prisma.stockItem.findFirst({
        where: { id: it.stockItemId, organizationId: orgId },
      });
      if (!stockItem) continue;
      const qty = parseFloat(it.quantity) || 0;
      if (qty <= 0) continue;
      const unitCost = it.unitCost != null ? parseFloat(it.unitCost) : stockItem.costPrice;
      const total = qty * unitCost;
      totalAmount += total;
      itemsToCreate.push({
        stockItemId: it.stockItemId,
        quantity: qty,
        unitCost,
        total,
      });
    }

    if (itemsToCreate.length === 0) throw new BadRequestException('Aucun article valide');

    return this.prisma.purchaseOrder.create({
      data: {
        reference,
        supplierId: data.supplierId,
        status: 'DRAFT',
        totalAmount,
        expectedDate: data.expectedDate ? new Date(data.expectedDate) : null,
        notes: data.notes || null,
        createdById: user.userId || user.id,
        organizationId: orgId,
        items: { create: itemsToCreate },
      },
      include: { supplier: true, items: { include: { stockItem: true } } },
    });
  }

  // ═══════════════════════════════════════════════════════
  //  SUGGESTION AUTO (articles critiques)
  // ═══════════════════════════════════════════════════════
  async suggestOrder(user: any, supplierId: string) {
    const orgId = await this.getOrganizationId(user);

    const items = await this.prisma.stockItem.findMany({
      where: {
        organizationId: orgId,
        supplierId,
        currentStock: { lte: 999 },  // tous
      },
    });

    // Filtrer les articles sous le seuil
    const critical = items.filter(i => i.currentStock <= i.minStock && i.minStock > 0);

    return {
      supplierId,
      items: critical.map(i => {
        // Quantité suggérée = max - current, ou 2x min si pas de max
        const max = i.maxStock || i.minStock * 2;
        const suggestQty = Math.max(i.minStock, Math.ceil((max - i.currentStock) * 100) / 100);
        return {
          stockItemId: i.id,
          name: i.name,
          unit: i.unit,
          currentStock: i.currentStock,
          minStock: i.minStock,
          suggestQty,
          unitCost: i.costPrice,
          total: suggestQty * i.costPrice,
        };
      }),
    };
  }

  // ═══════════════════════════════════════════════════════
  //  UPDATE
  // ═══════════════════════════════════════════════════════
  async update(user: any, id: string, data: any) {
    if (!this.canWrite(user)) throw new ForbiddenException('Acces refuse');
    const orgId = await this.getOrganizationId(user);
    const order = await this.prisma.purchaseOrder.findFirst({ where: { id, organizationId: orgId } });
    if (!order) throw new NotFoundException('Commande introuvable');
    if (order.status !== 'DRAFT') throw new BadRequestException('Seuls les brouillons sont modifiables');

    // Si items fournis, on remplace
    if (data.items) {
      await this.prisma.purchaseOrderItem.deleteMany({ where: { orderId: id } });

      let totalAmount = 0;
      const itemsToCreate: any[] = [];
      for (const it of data.items) {
        const stockItem = await this.prisma.stockItem.findFirst({
          where: { id: it.stockItemId, organizationId: orgId },
        });
        if (!stockItem) continue;
        const qty = parseFloat(it.quantity) || 0;
        if (qty <= 0) continue;
        const unitCost = it.unitCost != null ? parseFloat(it.unitCost) : stockItem.costPrice;
        const total = qty * unitCost;
        totalAmount += total;
        itemsToCreate.push({ stockItemId: it.stockItemId, quantity: qty, unitCost, total });
      }

      for (const item of itemsToCreate) {
        await this.prisma.purchaseOrderItem.create({ data: { ...item, orderId: id } });
      }

      return this.prisma.purchaseOrder.update({
        where: { id },
        data: {
          totalAmount,
          expectedDate: data.expectedDate ? new Date(data.expectedDate) : undefined,
          notes: data.notes ?? undefined,
        },
        include: { supplier: true, items: { include: { stockItem: true } } },
      });
    }

    return this.prisma.purchaseOrder.update({
      where: { id },
      data: {
        expectedDate: data.expectedDate ? new Date(data.expectedDate) : undefined,
        notes: data.notes ?? undefined,
      },
      include: { supplier: true, items: { include: { stockItem: true } } },
    });
  }

  // ═══════════════════════════════════════════════════════
  //  STATUS WORKFLOW
  // ═══════════════════════════════════════════════════════
  async send(user: any, id: string) {
    if (!this.canWrite(user)) throw new ForbiddenException('Acces refuse');
    const orgId = await this.getOrganizationId(user);
    const order = await this.prisma.purchaseOrder.findFirst({ where: { id, organizationId: orgId } });
    if (!order) throw new NotFoundException('Commande introuvable');
    if (order.status !== 'DRAFT') throw new BadRequestException('Seul un brouillon peut etre envoye');

    return this.prisma.purchaseOrder.update({
      where: { id },
      data: { status: 'SENT' },
    });
  }

  async cancel(user: any, id: string) {
    if (!this.canWrite(user)) throw new ForbiddenException('Acces refuse');
    const orgId = await this.getOrganizationId(user);
    const order = await this.prisma.purchaseOrder.findFirst({ where: { id, organizationId: orgId } });
    if (!order) throw new NotFoundException('Commande introuvable');
    if (['RECEIVED', 'CANCELLED'].includes(order.status)) {
      throw new BadRequestException('Commande deja cloturee');
    }
    return this.prisma.purchaseOrder.update({
      where: { id },
      data: { status: 'CANCELLED' },
    });
  }

  // ═══════════════════════════════════════════════════════
  //  RECEPTION (le point cle : cree les mouvements + augmente stock)
  // ═══════════════════════════════════════════════════════
  async receive(user: any, id: string, data: any) {
    if (!this.canWrite(user)) throw new ForbiddenException('Acces refuse');
    const orgId = await this.getOrganizationId(user);

    // Le check du statut + la réception sont DANS la même transaction.
    // On utilise updateMany avec WHERE status valide : si 0 ligne, déjà reçue.
    return this.prisma.$transaction(async (tx) => {
      const order = await tx.purchaseOrder.findFirst({
        where: { id, organizationId: orgId },
        include: { items: { include: { stockItem: true } } },
      });
      if (!order) throw new NotFoundException('Commande introuvable');
      if (order.status === 'RECEIVED') throw new BadRequestException('Commande deja receptionnee');
      if (order.status === 'CANCELLED') throw new BadRequestException('Commande annulee');

      const warehouseId = data.warehouseId || (
        await tx.stockWarehouse.findFirst({
          where: { organizationId: orgId, isDefault: true },
        })
      )?.id;
      if (!warehouseId) throw new BadRequestException('Aucun magasin disponible');

      const receivedMap: Record<string, number> = {};
      for (const it of (data.items || [])) {
        receivedMap[it.itemId] = parseFloat(it.receivedQty) || 0;
      }
      const useFull = Object.keys(receivedMap).length === 0;

      let allFull = true;

      for (const item of order.items) {
        const qtyToReceive = useFull ? item.quantity : (receivedMap[item.id] || 0);
        if (qtyToReceive <= 0) { allFull = false; continue; }

        await tx.stockMovement.create({
          data: {
            itemId: item.stockItemId,
            warehouseId,
            type: 'RECEPTION',
            quantity: qtyToReceive,
            unitCost: item.unitCost,
            reason: `Reception commande ${order.reference}`,
            reference: order.reference,
            userId: user.userId || user.id,
            organizationId: orgId,
          },
        });

        // PMP (prix moyen pondéré) — calcul dans la transaction
        const item0 = await tx.stockItem.findUnique({ where: { id: item.stockItemId } });
        if (item0) {
          const oldQty = item0.currentStock;
          const oldCost = item0.costPrice;
          const newQty = oldQty + qtyToReceive;
          const newPMP = newQty > 0
            ? (oldQty * oldCost + qtyToReceive * item.unitCost) / newQty
            : item.unitCost;

          await tx.stockItem.update({
            where: { id: item.stockItemId },
            data: { currentStock: { increment: qtyToReceive }, costPrice: newPMP },
          });
        }

        await tx.stockItemStock.upsert({
          where: {
            itemId_warehouseId: { itemId: item.stockItemId, warehouseId },
          },
          update: { quantity: { increment: qtyToReceive } },
          create: { itemId: item.stockItemId, warehouseId, quantity: qtyToReceive },
        });

        await tx.purchaseOrderItem.update({
          where: { id: item.id },
          data: { receivedQty: qtyToReceive },
        });
      }

      const newStatus = allFull || useFull ? 'RECEIVED' : 'PARTIAL';

      return tx.purchaseOrder.update({
        where: { id },
        data: { status: newStatus, receivedAt: new Date() },
        include: { supplier: true, items: { include: { stockItem: true } } },
      });
    });
  }

  async remove(user: any, id: string) {
    if (!this.canWrite(user)) throw new ForbiddenException('Acces refusé');
    const orgId = await this.getOrganizationId(user);
    const order = await this.prisma.purchaseOrder.findFirst({ where: { id, organizationId: orgId } });
    if (!order) throw new NotFoundException('Commande introuvable');
    if (!['DRAFT', 'CANCELLED'].includes(order.status)) {
      throw new BadRequestException('Seuls les brouillons et commandes annulees peuvent etre supprimes');
    }
    return this.prisma.purchaseOrder.delete({ where: { id } });
  }
}
