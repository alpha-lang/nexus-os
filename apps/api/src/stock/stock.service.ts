import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { paginate } from '../common/pagination/paginate';

@Injectable()
export class StockService {
  constructor(private prisma: PrismaService) {}

  private async getOrganizationId(user: any): Promise<string> {
    if (user.organizationId) return user.organizationId;
    throw new ForbiddenException("Reserve aux utilisateurs d'une organisation.");
  }

  private canWrite(user: any): boolean {
    return (user.role === 'SUPER_ADMIN' && user.isOwner) ||
      ['ADMIN', 'MANAGER', 'STOCK_MANAGER', 'FINANCE', 'RECEPTION', 'IT_TECH'].includes(user.role);
  }

  // ═══════════════════════════════════════════════════════
  //  DASHBOARD
  // ═══════════════════════════════════════════════════════
  async getDashboard(user: any) {
    const orgId = await this.getOrganizationId(user);

    const [items, movements30d, warehouses, suppliers] = await Promise.all([
      this.prisma.stockItem.findMany({ where: { organizationId: orgId } }),
      this.prisma.stockMovement.findMany({
        where: { organizationId: orgId, createdAt: { gte: new Date(Date.now() - 30 * 86400000) } },
      }),
      this.prisma.stockWarehouse.count({ where: { organizationId: orgId } }),
      this.prisma.partner.count({ where: { organizationId: orgId, type: 'SUPPLIER' } }),
    ]);

    const totalValue = items.reduce((s, i) => s + i.currentStock * i.costPrice, 0);
    const critical = items.filter(i => i.currentStock > 0 && i.currentStock <= i.minStock);
    const outOfStock = items.filter(i => i.currentStock <= 0);
    const incoming = movements30d.filter(m => m.type === 'RECEPTION').reduce((s, m) => s + m.quantity * (m.unitCost || 0), 0);
    const outgoing = movements30d.filter(m => ['CONSUMPTION', 'LOSS'].includes(m.type)).reduce((s, m) => s + Math.abs(m.quantity) * (m.unitCost || 0), 0);

    return {
      summary: {
        totalItems: items.length,
        totalValue,
        warehouses,
        suppliers,
        movements30d: movements30d.length,
        incoming30d: incoming,
        outgoing30d: outgoing,
      },
      alerts: {
        critical: critical.map(i => ({
          id: i.id, name: i.name, currentStock: i.currentStock, minStock: i.minStock, unit: i.unit, category: i.category,
        })),
        outOfStock: outOfStock.map(i => ({
          id: i.id, name: i.name, unit: i.unit, category: i.category,
        })),
      },
    };
  }

  // ═══════════════════════════════════════════════════════
  //  WAREHOUSES
  // ═══════════════════════════════════════════════════════
  async findAllWarehouses(user: any) {
    const orgId = await this.getOrganizationId(user);
    return this.prisma.stockWarehouse.findMany({
      where: { organizationId: orgId },
      include: { _count: { select: { stocks: true, movements: true } } },
      orderBy: [{ isDefault: 'desc' }, { name: 'asc' }],
    });
  }

  /**
   * Vue agrégée de tous les magasins : valeur, articles, alertes.
   */
  async getWarehouseStats(user: any) {
    const orgId = await this.getOrganizationId(user);

    const warehouses = await this.prisma.stockWarehouse.findMany({
      where: { organizationId: orgId },
      include: {
        _count: { select: { stocks: true, movements: true } },
      },
      orderBy: [{ isDefault: 'desc' }, { name: 'asc' }],
    });

    const since30d = new Date(Date.now() - 30 * 86400000);

    const results = await Promise.all(
      warehouses.map(async (w) => {
        const stocks = await this.prisma.stockItemStock.findMany({
          where: { warehouseId: w.id, quantity: { gt: 0 } },
          include: {
            item: {
              select: { id: true, name: true, sku: true, unit: true, costPrice: true, minStock: true, category: true },
            },
          },
        });

        const totalValue = stocks.reduce((s, st) => s + st.quantity * (st.item.costPrice || 0), 0);
        const totalArticles = stocks.length;
        const totalQty = stocks.reduce((s, st) => s + st.quantity, 0);

        // Alertes : stock magasin <= minStock global de l'article
        const alerts = stocks.filter((st) => st.quantity > 0 && st.quantity <= st.item.minStock);

        // Mouvements 30j pour ce magasin
        const mvt30d = await this.prisma.stockMovement.count({
          where: { warehouseId: w.id, createdAt: { gte: since30d } },
        });

        return {
          id: w.id,
          name: w.name,
          code: w.code,
          location: w.location,
          isDefault: w.isDefault,
          totalValue: Math.round(totalValue),
          totalArticles,
          totalQty: Math.round(totalQty * 100) / 100,
          alertsCount: alerts.length,
          movements30d: mvt30d,
          topAlerts: alerts.slice(0, 3).map((a) => ({
            id: a.item.id,
            name: a.item.name,
            quantity: a.quantity,
            minStock: a.item.minStock,
            unit: a.item.unit,
          })),
        };
      }),
    );

    // Totaux globaux
    const grandTotalValue = results.reduce((s, r) => s + r.totalValue, 0);
    const grandTotalArticles = results.reduce((s, r) => s + r.totalArticles, 0);
    const grandTotalAlerts = results.reduce((s, r) => s + r.alertsCount, 0);

    return {
      summary: {
        totalWarehouses: results.length,
        totalValue: grandTotalValue,
        totalArticles: grandTotalArticles,
        totalAlerts: grandTotalAlerts,
      },
      warehouses: results,
    };
  }

  /**
   * Détail d'un magasin : tous ses articles avec quantités + valeur.
   */
  async findOneWarehouse(user: any, id: string) {
    const orgId = await this.getOrganizationId(user);

    const warehouse = await this.prisma.stockWarehouse.findFirst({
      where: { id, organizationId: orgId },
    });
    if (!warehouse) throw new NotFoundException('Magasin introuvable');

    const stocks = await this.prisma.stockItemStock.findMany({
      where: { warehouseId: id },
      include: {
        item: {
          select: {
            id: true, name: true, sku: true, unit: true, category: true,
            costPrice: true, salePrice: true, minStock: true, maxStock: true,
            currentStock: true, isIngredient: true, isSellable: true,
          },
        },
      },
      orderBy: { item: { name: 'asc' } },
    });

    const items = stocks.map((s) => ({
      id: s.item.id,
      name: s.item.name,
      sku: s.item.sku,
      unit: s.item.unit,
      category: s.item.category,
      costPrice: s.item.costPrice,
      salePrice: s.item.salePrice,
      minStock: s.item.minStock,
      maxStock: s.item.maxStock,
      currentStockGlobal: s.item.currentStock,
      quantity: s.quantity,
      value: Math.round(s.quantity * s.item.costPrice),
      isIngredient: s.item.isIngredient,
      isSellable: s.item.isSellable,
      status:
        s.quantity <= 0
          ? (s.item.minStock > 0 ? 'OUT' : 'NONE')  // NONE = pas attendu ici
          : s.quantity <= s.item.minStock
          ? 'CRITICAL'
          : s.item.maxStock && s.quantity > s.item.maxStock
          ? 'OVER'
          : 'OK',
    }));

    const totalValue = items.reduce((s, i) => s + i.value, 0);
    // ⚠️ Une "alerte" = un article qui EXISTE dans ce magasin mais est sous le seuil.
    //    Un article à 0 n'est PAS une alerte — c'est juste qu'il n'est pas stocké ici.
    const alertsCount = items.filter(
      (i) => i.quantity > 0 && i.quantity <= i.minStock,
    ).length;

    // Mouvements récents
    const recentMovements = await this.prisma.stockMovement.findMany({
      where: { warehouseId: id },
      include: {
        item: { select: { id: true, name: true, unit: true } },
        user: { select: { id: true, name: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    return {
      warehouse: {
        id: warehouse.id,
        name: warehouse.name,
        code: warehouse.code,
        location: warehouse.location,
        isDefault: warehouse.isDefault,
      },
      summary: {
        totalArticles: items.filter((i) => i.quantity > 0).length,
        totalQty: Math.round(items.reduce((s, i) => s + i.quantity, 0) * 100) / 100,
        totalValue: Math.round(totalValue),
        alertsCount,
      },
      items,
      recentMovements,
    };
  }

  async createWarehouse(user: any, data: any) {
    if (!this.canWrite(user)) throw new ForbiddenException('Acces refuse');
    const orgId = await this.getOrganizationId(user);

    const existing = await this.prisma.stockWarehouse.findFirst({
      where: { organizationId: orgId, code: data.code },
    });
    if (existing) throw new BadRequestException('Ce code magasin existe deja');

    if (data.isDefault) {
      await this.prisma.stockWarehouse.updateMany({
        where: { organizationId: orgId, isDefault: true },
        data: { isDefault: false },
      });
    }

    return this.prisma.stockWarehouse.create({
      data: {
        name: data.name,
        code: data.code.toUpperCase(),
        location: data.location || null,
        isDefault: data.isDefault || false,
        organizationId: orgId,
      },
    });
  }

  async updateWarehouse(user: any, id: string, data: any) {
    if (!this.canWrite(user)) throw new ForbiddenException('Acces refuse');
    const orgId = await this.getOrganizationId(user);
    const wh = await this.prisma.stockWarehouse.findFirst({ where: { id, organizationId: orgId } });
    if (!wh) throw new NotFoundException('Magasin introuvable');

    if (data.isDefault && !wh.isDefault) {
      await this.prisma.stockWarehouse.updateMany({
        where: { organizationId: orgId, isDefault: true },
        data: { isDefault: false },
      });
    }

    return this.prisma.stockWarehouse.update({
      where: { id },
      data: {
        name: data.name ?? undefined,
        location: data.location ?? undefined,
        isDefault: data.isDefault ?? undefined,
      },
    });
  }

  async removeWarehouse(user: any, id: string) {
    if (!this.canWrite(user)) throw new ForbiddenException('Acces refuse');
    const orgId = await this.getOrganizationId(user);
    const wh = await this.prisma.stockWarehouse.findFirst({
      where: { id, organizationId: orgId },
      include: { _count: { select: { stocks: true } } },
    });
    if (!wh) throw new NotFoundException('Magasin introuvable');
    if (wh.isDefault) throw new BadRequestException('Impossible de supprimer le magasin par defaut');
    if (wh._count.stocks > 0) throw new BadRequestException('Ce magasin contient du stock');
    return this.prisma.stockWarehouse.delete({ where: { id } });
  }

  // ═══════════════════════════════════════════════════════
  //  SUPPLIERS
  // ═══════════════════════════════════════════════════════
  async findAllSuppliers(user: any) {
    const orgId = await this.getOrganizationId(user);
    return this.prisma.partner.findMany({
      where: { organizationId: orgId, type: 'SUPPLIER' },
      include: { _count: { select: { stockItems: true } } },
      orderBy: { name: 'asc' },
    });
  }

  /**
   * Vue enrichie des fournisseurs avec métriques stock :
   * articles fournis, commandes, achats, ruptures, délai.
   */
  async getSuppliersStats(user: any) {
    const orgId = await this.getOrganizationId(user);

    // 1. Fournisseurs (Partner SUPPLIER ou BOTH)
    const suppliers = await this.prisma.partner.findMany({
      where: { organizationId: orgId, type: { in: ['SUPPLIER', 'BOTH'] } },
      orderBy: { name: 'asc' },
    });

    // 2. Tous les articles liés à un fournisseur (1 requête)
    const allItems = await this.prisma.stockItem.findMany({
      where: { organizationId: orgId, supplierId: { not: null } },
      select: { id: true, supplierId: true, currentStock: true, minStock: true },
    });

    const itemsBySupplier: Record<string, { total: number; critical: number; out: number }> = {};
    for (const it of allItems) {
      if (!it.supplierId) continue;
      if (!itemsBySupplier[it.supplierId]) itemsBySupplier[it.supplierId] = { total: 0, critical: 0, out: 0 };
      const slot = itemsBySupplier[it.supplierId];
      slot.total++;
      if (it.currentStock <= 0) slot.out++;
      else if (it.currentStock <= it.minStock) slot.critical++;
    }

    // 3. Toutes les commandes (1 requête)
    const allOrders = await this.prisma.purchaseOrder.findMany({
      where: { organizationId: orgId },
      select: {
        id: true, reference: true, supplierId: true, status: true,
        totalAmount: true, createdAt: true, receivedAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    const ordersBySupplier: Record<string, {
      total: number; pending: number; received: number;
      totalPurchases: number; lastOrderAt: Date | null;
    }> = {};

    for (const o of allOrders) {
      if (!ordersBySupplier[o.supplierId]) {
        ordersBySupplier[o.supplierId] = { total: 0, pending: 0, received: 0, totalPurchases: 0, lastOrderAt: null };
      }
      const s = ordersBySupplier[o.supplierId];
      s.total++;
      if (['DRAFT', 'SENT', 'PARTIAL'].includes(o.status)) s.pending++;
      if (o.status === 'RECEIVED') {
        s.received++;
        s.totalPurchases += o.totalAmount || 0;
      }
      if (!s.lastOrderAt) s.lastOrderAt = o.createdAt;
    }

    // 4. Fusion
    const enriched = suppliers.map((s) => {
      const items = itemsBySupplier[s.id] || { total: 0, critical: 0, out: 0 };
      const orders = ordersBySupplier[s.id] || { total: 0, pending: 0, received: 0, totalPurchases: 0, lastOrderAt: null };
      return {
        id: s.id,
        name: s.name,
        contactName: s.contactName,
        phone: s.phone,
        email: s.email,
        address: s.address,
        city: s.city,
        leadTimeDays: s.leadTimeDays,
        notes: s.notes,
        isActive: s.isActive,
        articlesCount: items.total,
        articlesCritical: items.critical,
        articlesOut: items.out,
        totalOrders: orders.total,
        pendingOrders: orders.pending,
        receivedOrders: orders.received,
        totalPurchases: Math.round(orders.totalPurchases),
        lastOrderAt: orders.lastOrderAt,
      };
    });

    // 5. Totaux globaux
    const summary = {
      totalSuppliers: enriched.length,
      totalArticles: enriched.reduce((s, x) => s + x.articlesCount, 0),
      totalPendingOrders: enriched.reduce((s, x) => s + x.pendingOrders, 0),
      totalPurchases: enriched.reduce((s, x) => s + x.totalPurchases, 0),
      suppliersWithAlerts: enriched.filter((x) => x.articlesCritical + x.articlesOut > 0).length,
    };

    return { summary, suppliers: enriched };
  }

  async createSupplier(user: any, data: any) {
    if (!this.canWrite(user)) throw new ForbiddenException('Acces refuse');
    const isSuperAdmin = user.role === 'SUPER_ADMIN' && user.isOwner;
    const orgId = isSuperAdmin ? (data.organizationId || await this.getOrganizationId(user)) : await this.getOrganizationId(user);
    return this.prisma.partner.create({
      data: {
        type: 'SUPPLIER',
        name: data.name,
        contactName: data.contactName || null,
        phone: data.phone || null,
        email: data.email || null,
        address: data.address || null,
        leadTimeDays: data.leadTimeDays ? parseInt(data.leadTimeDays) : null,
        notes: data.notes || null,
        organizationId: orgId,
      },
    });
  }

  async updateSupplier(user: any, id: string, data: any) {
    if (!this.canWrite(user)) throw new ForbiddenException('Acces refuse');
    const orgId = await this.getOrganizationId(user);
    const s = await this.prisma.partner.findFirst({ where: { id, organizationId: orgId, type: 'SUPPLIER' } });
    if (!s) throw new NotFoundException('Fournisseur introuvable');
    return this.prisma.partner.update({
      where: { id },
      data: {
        name: data.name ?? undefined,
        contactName: data.contactName ?? undefined,
        phone: data.phone ?? undefined,
        email: data.email ?? undefined,
        address: data.address ?? undefined,
        leadTimeDays: data.leadTimeDays != null ? parseInt(data.leadTimeDays) : undefined,
        notes: data.notes ?? undefined,
      },
    });
  }

  async removeSupplier(user: any, id: string) {
    if (!this.canWrite(user)) throw new ForbiddenException('Acces refuse');
    const orgId = await this.getOrganizationId(user);
    const s = await this.prisma.partner.findFirst({
      where: { id, organizationId: orgId, type: 'SUPPLIER' },
      include: { _count: { select: { stockItems: true } } },
    });
    if (!s) throw new NotFoundException('Fournisseur introuvable');
    if (s._count.stockItems > 0) throw new BadRequestException('Des articles sont lies a ce fournisseur');
    return this.prisma.partner.delete({ where: { id } });
  }

  // ═══════════════════════════════════════════════════════
  //  ITEMS
  // ═══════════════════════════════════════════════════════
  async findAllItems(user: any, filters: any) {
    const orgId = await this.getOrganizationId(user);
    const where: any = { organizationId: orgId };

    if (filters.category) where.category = filters.category;
    if (filters.supplierId) where.supplierId = filters.supplierId;
    if (filters.isSellable === 'true') where.isSellable = true;
    if (filters.isIngredient === 'true') where.isIngredient = true;

    if (filters.status === 'CRITICAL') {
      where.AND = [{ currentStock: { gt: 0 } }, { currentStock: { lte: this.prisma.stockItem.fields.minStock } }];
    } else if (filters.status === 'OUT') {
      where.currentStock = { lte: 0 };
    }

    if (filters.search) {
      where.OR = [
        { name: { contains: filters.search, mode: 'insensitive' } },
        { sku: { contains: filters.search, mode: 'insensitive' } },
        { barcode: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    return this.prisma.stockItem.findMany({
      where,
      include: {
        supplier: { select: { id: true, name: true } },
        _count: { select: { movements: true, recipeLines: true } },
      },
      orderBy: { name: 'asc' },
    });
  }

  async findOneItem(user: any, id: string) {
    const orgId = await this.getOrganizationId(user);
    const item = await this.prisma.stockItem.findFirst({
      where: { id, organizationId: orgId },
      include: {
        supplier: true,
        warehouseStock: { include: { warehouse: true } },
        recipeLines: { include: { recipe: { select: { id: true, name: true, yield: true } } } },
      },
    });
    if (!item) throw new NotFoundException('Article introuvable');

    const movements = await this.prisma.stockMovement.findMany({
      where: { itemId: id },
      include: { user: { select: { name: true, email: true } }, warehouse: { select: { name: true, code: true } } },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    return { ...item, recentMovements: movements };
  }

  async createItem(user: any, data: any) {
    if (!this.canWrite(user)) throw new ForbiddenException('Acces refuse');
    const orgId = await this.getOrganizationId(user);

    if (data.sku) {
      const existing = await this.prisma.stockItem.findFirst({
        where: { organizationId: orgId, sku: data.sku },
      });
      if (existing) throw new BadRequestException('Ce SKU existe deja');
    }

    // Si l'utilisateur a explicitement choisi un magasin, on peut le rendre default si aucun n'existe
    const existingDefault = await this.prisma.stockWarehouse.findFirst({
      where: { organizationId: orgId, isDefault: true },
    });

    // Magasin de stockage choisi par l'utilisateur, sinon celui par défaut
    const targetWarehouse = data.warehouseId
      ? await this.prisma.stockWarehouse.findFirst({
          where: { id: data.warehouseId, organizationId: orgId },
        })
      : await this.prisma.stockWarehouse.findFirst({
          where: { organizationId: orgId, isDefault: true },
        });

    if (!targetWarehouse) {
      throw new BadRequestException(
        'Aucun magasin disponible. Créez un magasin avant d\'ajouter un article.',
      );
    }

    const item = await this.prisma.stockItem.create({
      data: {
        name: data.name,
        sku: data.sku || null,
        barcode: data.barcode || null,
        category: data.category || 'AUTRE',
        unit: data.unit || 'piece',
        currentStock: parseFloat(data.currentStock) || 0,
        minStock: parseFloat(data.minStock) || 0,
        maxStock: data.maxStock != null ? parseFloat(data.maxStock) : null,
        costPrice: parseFloat(data.costPrice) || 0,
        salePrice: data.salePrice != null ? parseFloat(data.salePrice) : null,
        isSellable: !!data.isSellable,
        isIngredient: !!data.isIngredient,
        supplierId: data.supplierId || null,
        organizationId: orgId,
      },
    });

    // Créer StockItemStock pour chaque magasin
    const warehouses = await this.prisma.stockWarehouse.findMany({
      where: { organizationId: orgId },
    });
    for (const w of warehouses) {
      await this.prisma.stockItemStock.create({
        data: {
          itemId: item.id,
          warehouseId: w.id,
          quantity: w.id === targetWarehouse.id ? item.currentStock : 0,
        },
      });
    }

    // Mouvement initial si stock > 0
    if (item.currentStock > 0) {
      await this.prisma.stockMovement.create({
        data: {
          itemId: item.id,
          warehouseId: targetWarehouse.id,
          type: 'RECEPTION',
          quantity: item.currentStock,
          unitCost: item.costPrice,
          reason: 'Stock initial',
          userId: user.userId || user.id,
          organizationId: orgId,
        },
      });
    }

    return item;
  }

  async updateItem(user: any, id: string, data: any) {
    if (!this.canWrite(user)) throw new ForbiddenException('Acces refuse');
    const orgId = await this.getOrganizationId(user);
    const item = await this.prisma.stockItem.findFirst({ where: { id, organizationId: orgId } });
    if (!item) throw new NotFoundException('Article introuvable');

    return this.prisma.stockItem.update({
      where: { id },
      data: {
        name: data.name ?? undefined,
        sku: data.sku ?? undefined,
        barcode: data.barcode ?? undefined,
        category: data.category ?? undefined,
        unit: data.unit ?? undefined,
        minStock: data.minStock != null ? parseFloat(data.minStock) : undefined,
        maxStock: data.maxStock != null ? parseFloat(data.maxStock) : undefined,
        costPrice: data.costPrice != null ? parseFloat(data.costPrice) : undefined,
        salePrice: data.salePrice != null ? parseFloat(data.salePrice) : undefined,
        isSellable: data.isSellable ?? undefined,
        isIngredient: data.isIngredient ?? undefined,
        supplierId: data.supplierId ?? undefined,
      },
    });
  }

  async removeItem(user: any, id: string) {
    if (!this.canWrite(user)) throw new ForbiddenException('Acces refuse');
    const orgId = await this.getOrganizationId(user);
    const item = await this.prisma.stockItem.findFirst({ where: { id, organizationId: orgId } });
    if (!item) throw new NotFoundException('Article introuvable');
    return this.prisma.stockItem.delete({ where: { id } });
  }

  // ═══════════════════════════════════════════════════════
  //  MOVEMENTS
  // ═══════════════════════════════════════════════════════
  async findAllMovements(user: any, filters: any) {
    const orgId = await this.getOrganizationId(user);
    const where: any = { organizationId: orgId };
    if (filters.type) where.type = filters.type;
    if (filters.itemId) where.itemId = filters.itemId;
    if (filters.warehouseId) where.warehouseId = filters.warehouseId;
    if (filters.from || filters.to) {
      where.createdAt = {};
      if (filters.from) where.createdAt.gte = new Date(filters.from);
      if (filters.to) where.createdAt.lte = new Date(filters.to);
    }

    const take = filters.take ? parseInt(filters.take, 10) : 50;

    return paginate(this.prisma.stockMovement, {
      where,
      orderBy: { createdAt: 'desc' },
      take,
      cursor: filters.cursor,
      include: {
        item: { select: { id: true, name: true, unit: true, category: true } },
        warehouse: { select: { id: true, name: true, code: true } },
        user: { select: { id: true, name: true, email: true } },
      },
    });
  }

  async createMovement(user: any, data: any) {
    if (!this.canWrite(user)) throw new ForbiddenException('Acces refuse');
    const orgId = await this.getOrganizationId(user);

    const quantity = parseFloat(data.quantity) || 0;
    if (quantity === 0) throw new BadRequestException('Quantite invalide');

    const type = data.type || 'RECEPTION';
    const isOut = ['CONSUMPTION', 'LOSS', 'TRANSFER_OUT'].includes(type);
    const absQty = Math.abs(quantity);

    // ═══════════════════════════════════════════════════════════
    // Tout est dans la transaction, y compris le check de stock.
    // Le UPDATE conditionnel (stock >= qty) est atomique :
    // si 0 ligne affectée → stock insuffisant (race-safe).
    // ═══════════════════════════════════════════════════════════
    return this.prisma.$transaction(async (tx) => {
      const item = await tx.stockItem.findFirst({
        where: { id: data.itemId, organizationId: orgId },
      });
      if (!item) throw new NotFoundException('Article introuvable');

      const warehouse = await tx.stockWarehouse.findFirst({
        where: { id: data.warehouseId, organizationId: orgId },
      });
      if (!warehouse) throw new NotFoundException('Magasin introuvable');

      if (isOut) {
        // UPDATE atomique : ne s'exécute que si stock suffisant
        const result = await tx.stockItem.updateMany({
          where: {
            id: data.itemId,
            organizationId: orgId,
            currentStock: { gte: absQty },
          },
          data: { currentStock: { decrement: absQty } },
        });
        if (result.count === 0) {
          throw new BadRequestException(
            `Stock insuffisant (${item.currentStock} ${item.unit} dispo, ${absQty} demandé)`,
          );
        }
      } else {
        await tx.stockItem.update({
          where: { id: data.itemId },
          data: { currentStock: { increment: absQty } },
        });
      }

      const movement = await tx.stockMovement.create({
        data: {
          itemId: data.itemId,
          warehouseId: data.warehouseId,
          type,
          quantity: isOut ? -absQty : absQty,
          unitCost: data.unitCost != null ? parseFloat(data.unitCost) : item.costPrice,
          reason: data.reason || null,
          reference: data.reference || null,
          lotNumber: data.lotNumber || null,
          expiresAt: data.expiresAt ? new Date(data.expiresAt) : null,
          userId: user.userId || user.id,
          organizationId: orgId,
        },
      });

      await tx.stockItemStock.upsert({
        where: {
          itemId_warehouseId: { itemId: item.id, warehouseId: data.warehouseId },
        },
        update: { quantity: { increment: isOut ? -absQty : absQty } },
        create: {
          itemId: item.id,
          warehouseId: data.warehouseId,
          quantity: isOut ? -absQty : absQty,
        },
      });

      return movement;
    });
  }

  async removeMovement(user: any, id: string) {
    if (!this.canWrite(user)) throw new ForbiddenException('Acces refuse');
    const orgId = await this.getOrganizationId(user);
    const movement = await this.prisma.stockMovement.findFirst({
      where: { id, organizationId: orgId },
    });
    if (!movement) throw new NotFoundException('Mouvement introuvable');

    // Annulation : inverse le mouvement
    return this.prisma.$transaction(async (tx) => {
      await tx.stockItem.update({
        where: { id: movement.itemId },
        data: { currentStock: { increment: -movement.quantity } },
      });
      await tx.stockItemStock.update({
        where: { itemId_warehouseId: { itemId: movement.itemId, warehouseId: movement.warehouseId } },
        data: { quantity: { increment: -movement.quantity } },
      });
      return tx.stockMovement.delete({ where: { id } });
    });
  }

  // ═══════════════════════════════════════════════════════
  //  TRANSFERS
  // ═══════════════════════════════════════════════════════
  /**
   * Historique des transferts entre magasins (agrégé par référence).
   */
  async getTransfersHistory(user: any, filters: any = {}) {
    const orgId = await this.getOrganizationId(user);

    // Un transfert = 2 mouvements (TRANSFER_OUT + TRANSFER_IN) partageant la même référence
    // On récupère tous les TRANSFER_OUT puis on groupe
    const outs = await this.prisma.stockMovement.findMany({
      where: { organizationId: orgId, type: 'TRANSFER_OUT' },
      include: {
        item: { select: { id: true, name: true, unit: true, sku: true } },
        warehouse: { select: { id: true, name: true, code: true } },
        user: { select: { id: true, name: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: filters.take ? parseInt(filters.take, 10) : 50,
    });

    // Pour chaque OUT, on cherche le IN correspondant (même item, même timestamp proche)
    const results = await Promise.all(
      outs.map(async (out) => {
        const inMvt = await this.prisma.stockMovement.findFirst({
          where: {
            organizationId: orgId,
            itemId: out.itemId,
            type: 'TRANSFER_IN',
            quantity: Math.abs(out.quantity),
            createdAt: {
              gte: new Date(out.createdAt.getTime() - 10000),
              lte: new Date(out.createdAt.getTime() + 10000),
            },
            warehouseId: { not: out.warehouseId },
          },
          include: {
            warehouse: { select: { id: true, name: true, code: true } },
          },
        });

        return {
          id: out.id,
          item: out.item,
          fromWarehouse: out.warehouse,
          toWarehouse: inMvt?.warehouse || null,
          quantity: Math.abs(out.quantity),
          unitCost: out.unitCost,
          reason: out.reason,
          user: out.user,
          date: out.createdAt,
        };
      }),
    );

    return { items: results, count: results.length, hasMore: outs.length === (filters.take ? parseInt(filters.take, 10) : 50) };
  }

  async transferBetweenWarehouses(user: any, data: any) {
    if (!this.canWrite(user)) throw new ForbiddenException('Acces refuse');
    const orgId = await this.getOrganizationId(user);

    if (data.fromWarehouseId === data.toWarehouseId) {
      throw new BadRequestException('Les magasins source et destination sont identiques');
    }

    const quantity = Math.abs(parseFloat(data.quantity) || 0);
    if (quantity <= 0) throw new BadRequestException('Quantite invalide');

    // Transaction : le check de stock est DANS la transaction via updateMany conditionnel
    return this.prisma.$transaction(async (tx) => {
      const item = await tx.stockItem.findFirst({
        where: { id: data.itemId, organizationId: orgId },
      });
      if (!item) throw new NotFoundException('Article introuvable');

      // UPDATE atomique : décrémente si stock suffisant dans le magasin source
      const result = await tx.stockItemStock.updateMany({
        where: {
          itemId: item.id,
          warehouseId: data.fromWarehouseId,
          quantity: { gte: quantity },
        },
        data: { quantity: { decrement: quantity } },
      });
      if (result.count === 0) {
        throw new BadRequestException(
          `Stock insuffisant dans le magasin source (demandé: ${quantity})`,
        );
      }

      // Sortie source
      const outMvt = await tx.stockMovement.create({
        data: {
          itemId: item.id,
          warehouseId: data.fromWarehouseId,
          type: 'TRANSFER_OUT',
          quantity: -quantity,
          unitCost: item.costPrice,
          reason: data.reason || 'Transfert entre magasins',
          userId: user.userId || user.id,
          organizationId: orgId,
        },
      });

      // Entrée destination
      const inMvt = await tx.stockMovement.create({
        data: {
          itemId: item.id,
          warehouseId: data.toWarehouseId,
          type: 'TRANSFER_IN',
          quantity: quantity,
          unitCost: item.costPrice,
          reason: data.reason || 'Transfert entre magasins',
          userId: user.userId || user.id,
          organizationId: orgId,
        },
      });

      await tx.stockItemStock.upsert({
        where: {
          itemId_warehouseId: { itemId: item.id, warehouseId: data.toWarehouseId },
        },
        update: { quantity: { increment: quantity } },
        create: { itemId: item.id, warehouseId: data.toWarehouseId, quantity },
      });

      return { out: outMvt, in: inMvt };
    });
  }

  async findAllRecipes(user: any) {
    const orgId = await this.getOrganizationId(user);
    const recipes = await this.prisma.recipe.findMany({
      where: { organizationId: orgId },
      include: {
        ingredients: { include: { stockItem: { select: { id: true, name: true, unit: true, costPrice: true } } } },
      },
      orderBy: { name: 'asc' },
    });

    // Calcul cout de revient et marge
    return recipes.map(r => {
      const cost = r.ingredients.reduce((s, ing) => s + ing.quantity * (ing.stockItem?.costPrice || 0), 0);
      const costPerPortion = r.yield > 0 ? cost / r.yield : cost;
      const sellingPrice = r.sellingPrice || 0;
      const margin = sellingPrice - costPerPortion;
      const marginPct = sellingPrice > 0 ? (margin / sellingPrice) * 100 : 0;
      return { ...r, costPerPortion, margin, marginPct };
    });
  }

  async findOneRecipe(user: any, id: string) {
    const orgId = await this.getOrganizationId(user);
    const recipe = await this.prisma.recipe.findFirst({
      where: { id, organizationId: orgId },
      include: { ingredients: { include: { stockItem: true } } },
    });
    if (!recipe) throw new NotFoundException('Recette introuvable');
    return recipe;
  }

  async createRecipe(user: any, data: any) {
    if (!this.canWrite(user)) throw new ForbiddenException('Acces refuse');
    const orgId = await this.getOrganizationId(user);

    const ingredients = (data.ingredients || []).filter((i: any) => i.stockItemId && i.quantity > 0);

    return this.prisma.recipe.create({
      data: {
        name: data.name,
        yield: parseInt(data.yield) || 1,
        sellingPrice: data.sellingPrice != null ? parseFloat(data.sellingPrice) : null,
        notes: data.notes || null,
        organizationId: orgId,
        ingredients: {
          create: ingredients.map((i: any) => ({
            stockItemId: i.stockItemId,
            quantity: parseFloat(i.quantity),
            unit: i.unit || 'piece',
          })),
        },
      },
      include: { ingredients: { include: { stockItem: true } } },
    });
  }

  async updateRecipe(user: any, id: string, data: any) {
    if (!this.canWrite(user)) throw new ForbiddenException('Acces refuse');
    const orgId = await this.getOrganizationId(user);
    const recipe = await this.prisma.recipe.findFirst({ where: { id, organizationId: orgId } });
    if (!recipe) throw new NotFoundException('Recette introuvable');

    if (data.ingredients) {
      await this.prisma.recipeIngredient.deleteMany({ where: { recipeId: id } });
    }

    const ingredients = (data.ingredients || []).filter((i: any) => i.stockItemId && i.quantity > 0);

    return this.prisma.recipe.update({
      where: { id },
      data: {
        name: data.name ?? undefined,
        yield: data.yield != null ? parseInt(data.yield) : undefined,
        sellingPrice: data.sellingPrice != null ? parseFloat(data.sellingPrice) : undefined,
        notes: data.notes ?? undefined,
        ingredients: data.ingredients ? {
          create: ingredients.map((i: any) => ({
            stockItemId: i.stockItemId,
            quantity: parseFloat(i.quantity),
            unit: i.unit || 'piece',
          })),
        } : undefined,
      },
      include: { ingredients: { include: { stockItem: true } } },
    });
  }

  async removeRecipe(user: any, id: string) {
    if (!this.canWrite(user)) throw new ForbiddenException('Acces refuse');
    const orgId = await this.getOrganizationId(user);
    const recipe = await this.prisma.recipe.findFirst({ where: { id, organizationId: orgId } });
    if (!recipe) throw new NotFoundException('Recette introuvable');
    return this.prisma.recipe.delete({ where: { id } });
  }

  // ═══════════════════════════════════════════════════════
  //  INVENTORY
  // ═══════════════════════════════════════════════════════
  // ═══════════════════════════════════════════════════════
  //  RAPPORTS AVANCES
  // ═══════════════════════════════════════════════════════

  /**
   * Rotation de stock : frequence de renouvellement par article.
   */
  async getRotationReport(user: any, days = 30) {
    const orgId = await this.getOrganizationId(user);
    const from = new Date(Date.now() - days * 86400000);

    const items = await this.prisma.stockItem.findMany({
      where: { organizationId: orgId },
      include: { supplier: { select: { name: true } } },
    });

    const movements = await this.prisma.stockMovement.findMany({
      where: { organizationId: orgId, createdAt: { gte: from } },
    });

    const mvtByItem: Record<string, { consumed: number; received: number }> = {};
    movements.forEach((m) => {
      if (!mvtByItem[m.itemId]) mvtByItem[m.itemId] = { consumed: 0, received: 0 };
      if (m.quantity < 0) mvtByItem[m.itemId].consumed += Math.abs(m.quantity);
      else mvtByItem[m.itemId].received += m.quantity;
    });

    return items.map((i) => {
      const m = mvtByItem[i.id] || { consumed: 0, received: 0 };
      const avgStock = i.currentStock > 0 ? i.currentStock : 1;
      const rotation = avgStock > 0 ? m.consumed / avgStock : 0;
      const dailyAvg = m.consumed / days;
      const daysLeft = dailyAvg > 0 ? i.currentStock / dailyAvg : null;
      return {
        id: i.id,
        name: i.name,
        sku: i.sku,
        category: i.category,
        unit: i.unit,
        currentStock: i.currentStock,
        minStock: i.minStock,
        supplier: i.supplier?.name || null,
        costPrice: i.costPrice,
        stockValue: i.currentStock * i.costPrice,
        consumed: Math.round(m.consumed * 100) / 100,
        received: Math.round(m.received * 100) / 100,
        rotation: Math.round(rotation * 100) / 100,
        dailyAvg: Math.round(dailyAvg * 1000) / 1000,
        daysLeft: daysLeft != null ? Math.round(daysLeft * 10) / 10 : null,
      };
    }).sort((a, b) => b.rotation - a.rotation);
  }

  /**
   * Analyse ABC : Pareto 80/15/5 sur la valeur consommee.
   */
  async getAbcReport(user: any, days = 30) {
    const orgId = await this.getOrganizationId(user);
    const from = new Date(Date.now() - days * 86400000);

    const items = await this.prisma.stockItem.findMany({
      where: { organizationId: orgId },
    });

    const movements = await this.prisma.stockMovement.findMany({
      where: { organizationId: orgId, createdAt: { gte: from }, quantity: { lt: 0 } },
    });

    const consumedValue: Record<string, number> = {};
    let total = 0;
    movements.forEach((m) => {
      const item = items.find((i) => i.id === m.itemId);
      if (!item) return;
      const value = Math.abs(m.quantity) * item.costPrice;
      consumedValue[m.itemId] = (consumedValue[m.itemId] || 0) + value;
      total += value;
    });

    const list = Object.entries(consumedValue).map(([id, value]) => {
      const item = items.find((i) => i.id === id);
      return {
        id,
        name: item?.name || '?',
        sku: item?.sku,
        category: item?.category,
        unit: item?.unit,
        currentStock: item?.currentStock || 0,
        value: Math.round(value),
        pct: total > 0 ? (value / total) * 100 : 0,
      };
    }).sort((a, b) => b.value - a.value);

    let cumul = 0;
    return list.map((r) => {
      cumul += r.pct;
      let cls = 'C';
      if (cumul <= 80) cls = 'A';
      else if (cumul <= 95) cls = 'B';
      return { ...r, cumulativePct: Math.round(cumul * 10) / 10, class: cls };
    });
  }

  /**
   * Historique des prix : evolution du cout unitaire par article.
   */
  async getPriceHistoryReport(user: any, itemId?: string) {
    const orgId = await this.getOrganizationId(user);
    const where: any = { organizationId: orgId, type: 'RECEPTION', unitCost: { not: null } };
    if (itemId) where.itemId = itemId;

    const movements = await this.prisma.stockMovement.findMany({
      where,
      include: {
        item: { select: { id: true, name: true, unit: true, costPrice: true } },
      },
      orderBy: { createdAt: 'asc' },
    });

    const byItem: Record<string, any[]> = {};
    movements.forEach((m) => {
      if (!byItem[m.itemId]) byItem[m.itemId] = [];
      byItem[m.itemId].push({
        date: m.createdAt,
        unitCost: m.unitCost,
        quantity: m.quantity,
        reference: m.reference,
      });
    });

    return Object.entries(byItem).map(([id, list]) => {
      const item = movements.find((m) => m.itemId === id)?.item;
      const first = list[0]?.unitCost || 0;
      const last = list[list.length - 1]?.unitCost || 0;
      const variation = first > 0 ? ((last - first) / first) * 100 : 0;
      return {
        itemId: id,
        name: item?.name || '?',
        unit: item?.unit || 'piece',
        currentCost: item?.costPrice || 0,
        firstCost: first,
        lastCost: last,
        variationPct: Math.round(variation * 10) / 10,
        points: list,
      };
    }).sort((a, b) => Math.abs(b.variationPct) - Math.abs(a.variationPct));
  }

  /**
   * Historique des inventaires groupés par référence.
   */
  async getInventoryHistory(user: any, filters: any = {}) {
    const orgId = await this.getOrganizationId(user);

    const where: any = {
      organizationId: orgId,
      type: 'INVENTORY',
    };
    if (filters.warehouseId) where.warehouseId = filters.warehouseId;
    if (filters.from || filters.to) {
      where.createdAt = {};
      if (filters.from) where.createdAt.gte = new Date(filters.from);
      if (filters.to) where.createdAt.lte = new Date(filters.to);
    }

    const movements = await this.prisma.stockMovement.findMany({
      where,
      include: {
        item: { select: { id: true, name: true, sku: true, unit: true, costPrice: true } },
        warehouse: { select: { id: true, name: true, code: true } },
        user: { select: { id: true, name: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 500,
    });

    // Groupe par référence
    const groups: Record<string, any> = {};
    for (const m of movements) {
      const ref = m.reference || 'SANS-REF';
      if (!groups[ref]) {
        groups[ref] = {
          reference: ref,
          warehouse: m.warehouse,
          user: m.user,
          date: m.createdAt,
          lines: [],
          totalGainValue: 0,
          totalLossValue: 0,
          totalGainQty: 0,
          totalLossQty: 0,
          itemsCount: 0,
        };
      }
      const g = groups[ref];
      const value = Math.abs(m.quantity) * (m.unitCost || m.item.costPrice || 0);
      if (m.quantity > 0) {
        g.totalGainValue += value;
        g.totalGainQty += m.quantity;
      } else {
        g.totalLossValue += value;
        g.totalLossQty += Math.abs(m.quantity);
      }
      g.itemsCount++;
      g.lines.push({
        itemName: m.item.name,
        sku: m.item.sku,
        unit: m.item.unit,
        quantity: m.quantity,
        value,
      });
    }

    const result = Object.values(groups)
      .map((g: any) => ({
        ...g,
        totalGainValue: Math.round(g.totalGainValue),
        totalLossValue: Math.round(g.totalLossValue),
        netValue: Math.round(g.totalGainValue - g.totalLossValue),
        netQty: Math.round((g.totalGainQty - g.totalLossQty) * 100) / 100,
      }))
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    const summary = {
      totalSessions: result.length,
      totalLossValue: result.reduce((s, r) => s + r.totalLossValue, 0),
      totalGainValue: result.reduce((s, r) => s + r.totalGainValue, 0),
      lastInventoryDate: result[0]?.date || null,
    };

    return { summary, sessions: result };
  }

  /**
   * Détail complet d'un inventaire (par référence).
   */
  async getInventoryDetail(user: any, reference: string) {
    const orgId = await this.getOrganizationId(user);

    const movements = await this.prisma.stockMovement.findMany({
      where: {
        organizationId: orgId,
        type: 'INVENTORY',
        reference,
      },
      include: {
        item: { select: { id: true, name: true, sku: true, unit: true, costPrice: true, minStock: true } },
        warehouse: { select: { id: true, name: true, code: true, location: true } },
        user: { select: { id: true, name: true, email: true } },
      },
      orderBy: { item: { name: 'asc' } },
    });

    if (movements.length === 0) throw new NotFoundException('Inventaire introuvable');

    const first = movements[0];

    const lines = movements.map((m) => ({
      itemId: m.item.id,
      name: m.item.name,
      sku: m.item.sku,
      unit: m.item.unit,
      quantity: m.quantity,
      unitCost: m.unitCost || m.item.costPrice || 0,
      value: Math.round(Math.abs(m.quantity) * (m.unitCost || m.item.costPrice || 0)),
      isLoss: m.quantity < 0,
    }));

    const losses = lines.filter((l) => l.isLoss);
    const gains = lines.filter((l) => !l.isLoss);

    return {
      reference,
      date: first.createdAt,
      warehouse: first.warehouse,
      user: first.user,
      reason: first.reason,
      lines,
      summary: {
        itemsCount: lines.length,
        lossesCount: losses.length,
        gainsCount: gains.length,
        totalLossValue: losses.reduce((s, l) => s + l.value, 0),
        totalGainValue: gains.reduce((s, l) => s + l.value, 0),
        totalLossQty: losses.reduce((s, l) => s + Math.abs(l.quantity), 0),
        totalGainQty: gains.reduce((s, l) => s + l.quantity, 0),
      },
    };
  }

  async submitInventory(user: any, data: any) {
    if (!this.canWrite(user)) throw new ForbiddenException('Acces refuse');
    const orgId = await this.getOrganizationId(user);
    const warehouseId = data.warehouseId;
    if (!warehouseId) throw new BadRequestException('Magasin requis');

    // Référence de session : fournie par le front ou générée
    let reference = data.reference;
    if (!reference) {
      const year = new Date().getFullYear();
      const month = String(new Date().getMonth() + 1).padStart(2, '0');
      const count = await this.prisma.stockMovement.count({
        where: { organizationId: orgId, type: 'INVENTORY' },
      });
      reference = `INV-${year}-${month}-${String(count + 1).padStart(3, '0')}`;
    }

    const counts = data.counts || [];
    const adjustments = [];

    for (const c of counts) {
      const item = await this.prisma.stockItem.findFirst({
        where: { id: c.itemId, organizationId: orgId },
      });
      if (!item) continue;

      const physical = parseFloat(c.quantity) || 0;
      const stockRow = await this.prisma.stockItemStock.findUnique({
        where: { itemId_warehouseId: { itemId: item.id, warehouseId } },
      });
      const theoretical = stockRow?.quantity || 0;
      const diff = physical - theoretical;

      if (Math.abs(diff) < 0.001) continue;

      await this.prisma.$transaction(async (tx) => {
        await tx.stockMovement.create({
          data: {
            itemId: item.id,
            warehouseId,
            type: 'INVENTORY',
            quantity: diff,
            unitCost: item.costPrice,
            reason: data.reason || 'Ajustement inventaire',
            reference,
            userId: user.userId || user.id,
            organizationId: orgId,
          },
        });
        await tx.stockItem.update({
          where: { id: item.id },
          data: { currentStock: { increment: diff } },
        });
        await tx.stockItemStock.update({
          where: { itemId_warehouseId: { itemId: item.id, warehouseId } },
          data: { quantity: physical },
        });
      });

      adjustments.push({
        itemId: item.id,
        name: item.name,
        theoretical,
        physical,
        diff,
        unit: item.unit,
      });
    }

    return { reference, adjustments, count: adjustments.length };
  }
}
