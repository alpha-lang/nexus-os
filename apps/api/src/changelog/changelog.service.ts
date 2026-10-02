import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ChangelogService {
  constructor(private prisma: PrismaService) {}

  private assertSuperAdmin(user: any) {
    if (!(user.role === 'SUPER_ADMIN' && user.isOwner)) {
      throw new ForbiddenException('Réservé au Super Admin');
    }
  }

  // Public : les 10 dernières nouveautés actives
  async getPublic() {
    return this.prisma.changelogEntry.findMany({
      where: { isActive: true },
      orderBy: { publishedAt: 'desc' },
      take: 10,
    });
  }

  async findAll(user: any) {
    this.assertSuperAdmin(user);
    return this.prisma.changelogEntry.findMany({
      orderBy: { publishedAt: 'desc' },
    });
  }

  async create(user: any, data: any) {
    this.assertSuperAdmin(user);
    return this.prisma.changelogEntry.create({
      data: {
        version: data.version,
        title: data.title,
        body: data.body,
        type: data.type || 'FEATURE',
        publishedAt: data.publishedAt ? new Date(data.publishedAt) : new Date(),
        isActive: data.isActive !== false,
        createdById: user.userId,
      },
    });
  }

  async update(user: any, id: string, data: any) {
    this.assertSuperAdmin(user);
    const exists = await this.prisma.changelogEntry.findUnique({ where: { id } });
    if (!exists) throw new NotFoundException('Entrée introuvable');
    return this.prisma.changelogEntry.update({
      where: { id },
      data: {
        version: data.version ?? undefined,
        title: data.title ?? undefined,
        body: data.body ?? undefined,
        type: data.type ?? undefined,
        publishedAt: data.publishedAt ? new Date(data.publishedAt) : undefined,
        isActive: data.isActive ?? undefined,
      },
    });
  }

  async remove(user: any, id: string) {
    this.assertSuperAdmin(user);
    return this.prisma.changelogEntry.delete({ where: { id } });
  }
}
