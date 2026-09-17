import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcryptjs';
import { paginate } from '../common/pagination/paginate';
import { Role } from '@prisma/client';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

// Rôles qu'un non-SUPER_ADMIN ne peut PAS attribuer
const PRIVILEGED_ROLES: Role[] = ['SUPER_ADMIN', 'ADMIN'];

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  private assertCanAssignRole(actor: any, targetRole?: Role) {
    if (!targetRole) return;
    const isSuperAdmin = actor.role === 'SUPER_ADMIN' && actor.isOwner;
    if (PRIVILEGED_ROLES.includes(targetRole) && !isSuperAdmin) {
      throw new ForbiddenException(
        `Seul un SUPER_ADMIN owner peut attribuer le rôle ${targetRole}`,
      );
    }
  }

  private async isInternal(user: any): Promise<boolean> {
    if (user.role === 'SUPER_ADMIN') return true;
    if (!user.organizationId) return false;
    const org = await this.prisma.organization.findUnique({
      where: { id: user.organizationId },
    });
    return org?.type === 'INTERNE';
  }

  async findAll(user: any, filters: any = {}) {
    const internal = await this.isInternal(user);
    const where: any = {};
    if (!internal) where.organizationId = user.organizationId;
    if (filters.role) where.role = filters.role;
    if (filters.search) {
      where.OR = [
        { name: { contains: filters.search, mode: 'insensitive' } },
        { email: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    return paginate(this.prisma.user, {
      where,
      orderBy: { createdAt: 'desc' },
      take: filters.take ? parseInt(filters.take, 10) : 30,
      cursor: filters.cursor,
      // ⚠️ JAMAIS retourner le hash password au client
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        organizationId: true,
        branchId: true,
        isActive: true,
        isOwner: true,
        createdAt: true,
        updatedAt: true,
        organization: { select: { id: true, name: true } },
      },
    });
  }

  async findOne(id: string, user?: any) {
    const where: any = { id };
    if (user && user.role !== 'SUPER_ADMIN' && user.role !== 'ADMIN') {
      where.organizationId = user.organizationId;
    }
    const found = await this.prisma.user.findFirst({
      where,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        organizationId: true,
        branchId: true,
        isActive: true,
        isOwner: true,
        createdAt: true,
        updatedAt: true,
        organization: { select: { id: true, name: true } },
      },
    });
    if (!found) throw new NotFoundException('Utilisateur introuvable');
    return found;
  }

  async create(dto: CreateUserDto, actor?: any) {
    // Vérif du rôle cible
    this.assertCanAssignRole(actor, dto.role);

    // Isolation : un ADMIN d'org ne peut créer que dans sa propre org
    let organizationId = dto.organizationId || actor?.organizationId || null;
    if (actor && actor.role !== 'SUPER_ADMIN' && actor.organizationId) {
      organizationId = actor.organizationId;
    }

    const hashed = await bcrypt.hash(dto.password, 10);

    return this.prisma.user.create({
      data: {
        email: dto.email,
        password: hashed,
        name: dto.name || null,
        role: dto.role || 'USER',
        organizationId,
        branchId: dto.branchId || null,
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        organizationId: true,
        branchId: true,
        isActive: true,
        isOwner: true,
        createdAt: true,
        updatedAt: true,
        organization: { select: { id: true, name: true } },
      },
    });
  }

  async update(id: string, dto: UpdateUserDto, actor?: any) {
    await this.findOne(id, actor);

    // Vérif du rôle cible si on le change
    if (dto.role) this.assertCanAssignRole(actor, dto.role);

    const data: any = {
      email: dto.email,
      name: dto.name,
      role: dto.role,
      organizationId: dto.organizationId,
      branchId: dto.branchId,
      isActive: dto.isActive,
    };
    if (dto.password) {
      data.password = await bcrypt.hash(dto.password, 10);
    }
    // Nettoie les undefined
    Object.keys(data).forEach((k) => data[k] === undefined && delete data[k]);

    return this.prisma.user.update({
      where: { id },
      data,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        organizationId: true,
        branchId: true,
        isActive: true,
        isOwner: true,
        createdAt: true,
        updatedAt: true,
        organization: { select: { id: true, name: true } },
      },
    });
  }

  async remove(id: string, actor?: any) {
    const target = await this.findOne(id, actor);
    if (target.role === 'SUPER_ADMIN' && target.isOwner) {
      throw new ForbiddenException('Impossible de supprimer le SUPER_ADMIN owner');
    }
    if (target.id === actor?.userId) {
      throw new ForbiddenException('Impossible de se supprimer soi-même');
    }
    return this.prisma.user.delete({ where: { id } });
  }
}
