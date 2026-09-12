import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

@Injectable()
export class SalesService {
  constructor(private prisma: PrismaService) {}

  private async isInternalUser(user: any): Promise<boolean> {
    if (user.role === 'SUPER_ADMIN') return true;
    if (user.organizationId) {
      const org = await this.prisma.organization.findUnique({ where: { id: user.organizationId } });
      return org?.type === 'INTERNE';
    }
    return false;
  }

  async findAll(user: any) {
    const canSeeAll = await this.isInternalUser(user);
    const where = canSeeAll ? {} : { organizationId: user.organizationId };
    return this.prisma.sale.findMany({
      where,
      include: { customer: true, module: true, catalogItem: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string, user: any) {
    const sale = await this.prisma.sale.findFirst({
      where: { id },
      include: { customer: true, module: true, catalogItem: true },
    });
    if (!sale) throw new NotFoundException('Vente introuvable');
    const canAccess = await this.isInternalUser(user) || sale.organizationId === user.organizationId;
    if (!canAccess) throw new NotFoundException('Vente introuvable');
    return sale;
  }

  async create(data: any, user: any) {
    const canCreateForAny = await this.isInternalUser(user);
    let organizationId = user.organizationId;
    if (canCreateForAny) {
      if (!data.organizationId) throw new BadRequestException("Veuillez sélectionner l'organisation.");
      organizationId = data.organizationId;
    } else if (!organizationId) {
      throw new BadRequestException('Organisation requise');
    }

    if (data.catalogItemId) {
      const catalogItem = await this.prisma.catalogItem.findFirst({
        where: { id: data.catalogItemId, organizationId },
      });
      if (!catalogItem) throw new NotFoundException('Produit introuvable');
      if (catalogItem.stock < data.quantity) throw new BadRequestException('Stock insuffisant');

      const total = catalogItem.price * data.quantity;
      const sale = await this.prisma.sale.create({
        data: {
          customerId: data.customerId || null,
          catalogItemId: data.catalogItemId,
          quantity: data.quantity,
          total,
          organizationId,
        },
      });
      await this.prisma.catalogItem.update({
        where: { id: catalogItem.id },
        data: { stock: catalogItem.stock - data.quantity },
      });
      return this.prisma.sale.findUnique({ where: { id: sale.id }, include: { customer: true, catalogItem: true } });
    }

    if (data.moduleId) {
      const module = await this.prisma.module.findFirst({ where: { id: data.moduleId, organizationId } });
      if (!module) throw new NotFoundException('Module introuvable');
      const total = module.price * data.quantity;
      const sale = await this.prisma.sale.create({
        data: {
          customerId: data.customerId || null,
          moduleId: data.moduleId,
          quantity: data.quantity,
          total,
          organizationId,
        },
      });
      return this.prisma.sale.findUnique({ where: { id: sale.id }, include: { customer: true, module: true } });
    }

    throw new BadRequestException('Produit ou module requis');
  }

  async update(id: string, data: any, user: any) {
    const existing = await this.findOne(id, user);
    const organizationId = existing.organizationId;

    if (data.catalogItemId) {
      const newCatalogItem = await this.prisma.catalogItem.findFirst({
        where: { id: data.catalogItemId, organizationId },
      });
      if (!newCatalogItem) throw new NotFoundException('Produit introuvable');
      const newQuantity = data.quantity ?? existing.quantity;

      if (existing.catalogItemId && existing.catalogItemId !== data.catalogItemId) {
        await this.prisma.catalogItem.update({
          where: { id: existing.catalogItemId },
          data: { stock: { increment: existing.quantity } },
        });
        if (newCatalogItem.stock < newQuantity) throw new BadRequestException('Stock insuffisant');
        await this.prisma.catalogItem.update({
          where: { id: data.catalogItemId },
          data: { stock: { decrement: newQuantity } },
        });
      } else if (existing.catalogItemId) {
        const diff = newQuantity - existing.quantity;
        if (diff > newCatalogItem.stock) throw new BadRequestException('Stock insuffisant');
        await this.prisma.catalogItem.update({
          where: { id: existing.catalogItemId },
          data: { stock: { decrement: diff } },
        });
      } else {
        if (newCatalogItem.stock < newQuantity) throw new BadRequestException('Stock insuffisant');
        await this.prisma.catalogItem.update({
          where: { id: data.catalogItemId },
          data: { stock: { decrement: newQuantity } },
        });
      }

      const total = data.price ? data.price * newQuantity : newCatalogItem.price * newQuantity;
      return this.prisma.sale.update({
        where: { id },
        data: {
          catalogItemId: data.catalogItemId,
          quantity: newQuantity,
          total,
          customerId: data.customerId ?? existing.customerId,
        },
        include: { customer: true, catalogItem: true },
      });
    }

    const module = existing.module;
    const newQuantity = data.quantity ?? existing.quantity;
    const total = data.price ? data.price * newQuantity : (module?.price ?? 0) * newQuantity;

    return this.prisma.sale.update({
      where: { id },
      data: {
        quantity: newQuantity,
        total,
        customerId: data.customerId ?? existing.customerId,
      },
      include: { customer: true, module: true },
    });
  }

  async remove(id: string, user: any) {
    const existing = await this.findOne(id, user);

    if (existing.catalogItemId) {
      await this.prisma.catalogItem.update({
        where: { id: existing.catalogItemId },
        data: { stock: { increment: existing.quantity } },
      });
    }

    return this.prisma.sale.delete({ where: { id } });
  }
}
