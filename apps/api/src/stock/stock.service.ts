import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

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

  async createSupplier(user: any, data: any) {
    if (!this.canWrite(user)) throw new ForbiddenException('Acces refuse');
    const orgId = await this.getOrganizationId(user);
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

    const defaultWarehouse = await this.prisma.stockWarehouse.findFirst({
      where: { organizationId: orgId, isDefault: true },
    });

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
    const warehouses = await this.prisma.stockWarehouse.findMany({ where: { organizationId: orgId } });
    for (const w of warehouses) {
      await this.prisma.stockItemStock.create({
        data: {
          itemId: item.id,
          warehouseId: w.id,
          quantity: w.id === defaultWarehouse?.id ? item.currentStock : 0,
        },
      });
    }

    // Mouvement initial si stock > 0
    if (item.currentStock > 0 && defaultWarehouse) {
      await this.prisma.stockMovement.create({
        data: {
          itemId: item.id,
          warehouseId: defaultWarehouse.id,
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

    return this.prisma.stockMovement.findMany({
      where,
      include: {
        item: { select: { id: true, name: true, unit: true, category: true } },
        warehouse: { select: { id: true, name: true, code: true } },
        user: { select: { id: true, name: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 500,
    });
  }

  /**
   * Cree un mouvement et ajuste le stock de l'article + StockItemStock du magasin.
   */
  async createMovement(user: any, data: any) {
    if (!this.canWrite(user)) throw new ForbiddenException('Acces refuse');
    const orgId = await this.getOrganizationId(user);

    const item = await this.prisma.stockItem.findFirst({
      where: { id: data.itemId, organizationId: orgId },
    });
    if (!item) throw new NotFoundException('Article introuvable');

    const warehouse = await this.prisma.stockWarehouse.findFirst({
      where: { id: data.warehouseId, organizationId: orgId },
    });
    if (!warehouse) throw new NotFoundException('Magasin introuvable');

    const quantity = parseFloat(data.quantity) || 0;
    if (quantity === 0) throw new BadRequestException('Quantite invalide');

    const type = data.type || 'RECEPTION';
    const isOut = ['CONSUMPTION', 'LOSS', 'TRANSFER_OUT'].includes(type);
    const signedQty = isOut ? -Math.abs(quantity) : Math.abs(quantity);

    // Verif stock suffisant pour les sorties
    if (isOut && item.currentStock < Math.abs(quantity)) {
      throw new BadRequestException(`Stock insuffisant (${item.currentStock} ${item.unit} dispo)`);
    }

    return this.prisma.$transaction(async (tx) => {
      const movement = await tx.stockMovement.create({
        data: {
          itemId: data.itemId,
          warehouseId: data.warehouseId,
          type,
          quantity: signedQty,
          unitCost: data.unitCost != null ? parseFloat(data.unitCost) : item.costPrice,
          reason: data.reason || null,
          reference: data.reference || null,
          lotNumber: data.lotNumber || null,
          expiresAt: data.expiresAt ? new Date(data.expiresAt) : null,
          userId: user.userId || user.id,
          organizationId: orgId,
        },
      });

      // MAJ currentStock global
      await tx.stockItem.update({
        where: { id: item.id },
        data: { currentStock: { increment: signedQty } },
      });

      // MAJ stock du magasin
      await tx.stockItemStock.upsert({
        where: { itemId_warehouseId: { itemId: item.id, warehouseId: data.warehouseId } },
        update: { quantity: { increment: signedQty } },
        create: { itemId: item.id, warehouseId: data.warehouseId, quantity: signedQty },
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
  async transferBetweenWarehouses(user: any, data: any) {
    if (!this.canWrite(user)) throw new ForbiddenException('Acces refuse');
    const orgId = await this.getOrganizationId(user);

    if (data.fromWarehouseId === data.toWarehouseId) {
      throw new BadRequestException('Les magasins source et destination sont identiques');
    }

    const item = await this.prisma.stockItem.findFirst({
      where: { id: data.itemId, organizationId: orgId },
    });
    if (!item) throw new NotFoundException('Article introuvable');

    const quantity = Math.abs(parseFloat(data.quantity) || 0);
    if (quantity <= 0) throw new BadRequestException('Quantite invalide');

    const fromStock = await this.prisma.stockItemStock.findUnique({
      where: { itemId_warehouseId: { itemId: item.id, warehouseId: data.fromWarehouseId } },
    });
    if (!fromStock || fromStock.quantity < quantity) {
      throw new BadRequestException(`Stock insuffisant dans le magasin source (${fromStock?.quantity || 0} dispo)`);
    }

    return this.prisma.$transaction(async (tx) => {
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
      await tx.stockItemStock.update({
        where: { itemId_warehouseId: { itemId: item.id, warehouseId: data.fromWarehouseId } },
        data: { quantity: { decrement: quantity } },
      });

      // Entree destination
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
        where: { itemId_warehouseId: { itemId: item.id, warehouseId: data.toWarehouseId } },
        update: { quantity: { increment: quantity } },
        create: { itemId: item.id, warehouseId: data.toWarehouseId, quantity },
      });

      return { out: outMvt, in: inMvt };
    });
  }

  // ═══════════════════════════════════════════════════════
  //  RECIPES
  // ═══════════════════════════════════════════════════════
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

  async submitInventory(user: any, data: any) {
    if (!this.canWrite(user)) throw new ForbiddenException('Acces refuse');
    const orgId = await this.getOrganizationId(user);
    const warehouseId = data.warehouseId;
    if (!warehouseId) throw new BadRequestException('Magasin requis');

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

    return { adjustments, count: adjustments.length };
  }
}
