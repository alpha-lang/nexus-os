import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async findAll(user: any) {
    // Super Admin ou organisation interne (Nexus Corp) : voit tous les utilisateurs
    const isInternal = user.role === 'SUPER_ADMIN' || 
      (user.organizationId && (await this.prisma.organization.findUnique({ where: { id: user.organizationId } }))?.type === 'INTERNE');

    if (isInternal) {
      return this.prisma.user.findMany({
        include: { organization: { select: { id: true, name: true } } },
        orderBy: { createdAt: 'desc' },
      });
    }
    // Autres rôles : voient uniquement les utilisateurs de leur organisation
    return this.prisma.user.findMany({
      where: { organizationId: user.organizationId },
      include: { organization: { select: { id: true, name: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string, user?: any) {
    const where: any = { id };
    if (user && user.role !== 'SUPER_ADMIN' && user.role !== 'ADMIN') {
      where.organizationId = user.organizationId;
    }
    const found = await this.prisma.user.findFirst({ where, include: { organization: { select: { id: true, name: true } } } });
    if (!found) throw new NotFoundException('Utilisateur introuvable');
    return found;
  }

  async create(data: any, user?: any) {
    const hashed = await bcrypt.hash(data.password, 10);
    // Si l'admin ne précise pas d'organisation, on prend celle de l'utilisateur connecté (Nexus Corp)
    const organizationId = data.organizationId || user?.organizationId || null;

    return this.prisma.user.create({
      data: {
        email: data.email,
        password: hashed,
        name: data.name || null,
        role: data.role || 'USER',
        organizationId,
        branchId: data.branchId || null,
      },
      include: { organization: { select: { id: true, name: true } } },
    });
  }

  async update(id: string, data: any, user?: any) {
    await this.findOne(id, user);
    const updateData: any = { ...data };
    if (data.password) {
      updateData.password = await bcrypt.hash(data.password, 10);
    } else {
      delete updateData.password;
    }
    // Si l'organisation est vide, on garde celle de l'utilisateur connecté
    if (!updateData.organizationId) {
      delete updateData.organizationId;
    }
    return this.prisma.user.update({
      where: { id },
      data: updateData,
      include: { organization: { select: { id: true, name: true } } },
    });
  }

  async remove(id: string, user?: any) {
    await this.findOne(id, user);
    return this.prisma.user.delete({ where: { id } });
  }
}
