import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class MacrosService {
  constructor(private prisma: PrismaService) {}

  private assertSuperAdmin(user: any) {
    if (!(user.role === 'SUPER_ADMIN' && user.isOwner)) {
      throw new ForbiddenException('Réservé au Super Admin');
    }
  }

  async findAll(user: any) {
    this.assertSuperAdmin(user);
    return this.prisma.ticketMacro.findMany({
      orderBy: [{ usageCount: 'desc' }, { name: 'asc' }],
    });
  }

  async create(user: any, data: any) {
    this.assertSuperAdmin(user);
    return this.prisma.ticketMacro.create({
      data: {
        name: data.name?.trim(),
        content: data.content?.trim(),
        category: data.category || null,
      },
    });
  }

  async update(user: any, id: string, data: any) {
    this.assertSuperAdmin(user);
    const exists = await this.prisma.ticketMacro.findUnique({ where: { id } });
    if (!exists) throw new NotFoundException('Macro introuvable');
    return this.prisma.ticketMacro.update({
      where: { id },
      data: {
        name: data.name ?? undefined,
        content: data.content ?? undefined,
        category: data.category !== undefined ? (data.category || null) : undefined,
      },
    });
  }

  async remove(user: any, id: string) {
    this.assertSuperAdmin(user);
    return this.prisma.ticketMacro.delete({ where: { id } });
  }

  /**
   * Incrémente usageCount + retourne la macro (appelé quand un admin utilise une macro).
   */
  async use(user: any, id: string) {
    this.assertSuperAdmin(user);
    const macro = await this.prisma.ticketMacro.findUnique({ where: { id } });
    if (!macro) throw new NotFoundException('Macro introuvable');
    return this.prisma.ticketMacro.update({
      where: { id },
      data: { usageCount: { increment: 1 } },
    });
  }
}
