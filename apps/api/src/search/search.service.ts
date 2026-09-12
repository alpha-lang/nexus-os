import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

@Injectable()
export class SearchService {
  constructor(private prisma: PrismaService) {}

  async search(user: any, q: string) {
    if (!q || q.trim().length < 2) {
      return { customers: [], users: [], organizations: [], reservations: [], modules: [] };
    }

    const query = q.trim();
    const orgId = user.organizationId;
    const isSuper = user.role === 'SUPER_ADMIN' && user.isOwner;

    const orgFilter = isSuper || !orgId ? {} : { organizationId: orgId };

    const [customers, users, organizations, reservations, modules] = await Promise.all([
      this.prisma.partner.findMany({
        where: {
          ...orgFilter,
          type: 'CUSTOMER',
          OR: [
            { firstName: { contains: query, mode: 'insensitive' } },
            { lastName: { contains: query, mode: 'insensitive' } },
            { email: { contains: query, mode: 'insensitive' } },
            { phone: { contains: query, mode: 'insensitive' } },
          ],
        },
        take: 5,
        select: { id: true, firstName: true, lastName: true, email: true, phone: true, city: true },
      }),

      isSuper
        ? this.prisma.user.findMany({
            where: {
              OR: [
                { name: { contains: query, mode: 'insensitive' } },
                { email: { contains: query, mode: 'insensitive' } },
              ],
            },
            take: 5,
            select: { id: true, name: true, email: true, role: true, organizationId: true },
          })
        : Promise.resolve([]),

      isSuper
        ? this.prisma.organization.findMany({
            where: {
              OR: [
                { name: { contains: query, mode: 'insensitive' } },
                { slug: { contains: query, mode: 'insensitive' } },
              ],
            },
            take: 5,
            select: { id: true, name: true, slug: true, type: true },
          })
        : Promise.resolve([]),

      this.prisma.reservation.findMany({
        where: {
          ...orgFilter,
          OR: [
            { reference: { contains: query, mode: 'insensitive' } },
            { customer: { firstName: { contains: query, mode: 'insensitive' } } },
            { customer: { lastName: { contains: query, mode: 'insensitive' } } },
          ],
        },
        take: 5,
        select: {
          id: true,
          reference: true,
          status: true,
          customer: { select: { firstName: true, lastName: true } },
        },
      }),

      isSuper
        ? this.prisma.module.findMany({
            where: { name: { contains: query, mode: 'insensitive' } },
            take: 5,
            select: { id: true, name: true, route: true, price: true },
          })
        : Promise.resolve([]),
    ]);

    return { customers, users, organizations, reservations, modules };
  }
}
