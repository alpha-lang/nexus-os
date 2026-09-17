import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class HotelService {
  constructor(private prisma: PrismaService) {}

  private async getOrganizationId(user: any): Promise<string> {
    if (user.organizationId) return user.organizationId;
    throw new ForbiddenException("Les modules métier sont réservés aux utilisateurs d'une organisation.");
  }

  private canWrite(user: any): boolean {
    return (
      (user.role === 'SUPER_ADMIN' && user.isOwner) ||
      ['ADMIN', 'MANAGER', 'RECEPTION', 'STOCK_MANAGER', 'IT_TECH'].includes(user.role)
    );
  }

  // ==========================================
  // PLANNING VISUEL
  // ==========================================
  async getPlanning(user: any, from: string, to: string) {
    const orgId = await this.getOrganizationId(user);
    const start = new Date(from);
    const end = new Date(to);

    const rooms = await this.prisma.room.findMany({
      where: { organizationId: orgId },
      include: { roomType: true },
      orderBy: [{ floor: 'asc' }, { number: 'asc' }],
    });

    const reservations = await this.prisma.reservation.findMany({
      where: {
        organizationId: orgId,
        status: { notIn: ['CANCELLED', 'NO_SHOW'] },
        AND: [{ checkInDate: { lt: end } }, { checkOutDate: { gt: start } }],
      },
      include: { customer: true },
    });

    return { rooms, reservations, from: start, to: end };
  }

  // ==========================================
  // HOUSEKEEPING
  // ==========================================
  async findAllHousekeeping(user: any, status?: string) {
    const orgId = await this.getOrganizationId(user);
    return this.prisma.housekeepingTask.findMany({
      where: { organizationId: orgId, ...(status ? { status } : {}) },
      include: {
        room: { include: { roomType: true } },
        assignedTo: { select: { id: true, name: true, email: true } },
      },
      orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
    });
  }

  async createHousekeeping(user: any, data: any) {
    if (!this.canWrite(user)) throw new ForbiddenException('Accès refusé');
    const orgId = await this.getOrganizationId(user);

    const room = await this.prisma.room.findFirst({
      where: { id: data.roomId, organizationId: orgId },
    });
    if (!room) throw new NotFoundException('Chambre introuvable');

    return this.prisma.housekeepingTask.create({
      data: {
        roomId: data.roomId,
        assignedToId: data.assignedToId || null,
        status: data.status || 'PENDING',
        priority: data.priority || 'NORMAL',
        notes: data.notes || null,
        dueDate: data.dueDate ? new Date(data.dueDate) : null,
        organizationId: orgId,
      },
      include: { room: true, assignedTo: true },
    });
  }

  async updateHousekeeping(user: any, id: string, data: any) {
    if (!this.canWrite(user)) throw new ForbiddenException('Accès refusé');
    const task = await this.prisma.housekeepingTask.findUnique({ where: { id } });
    if (!task) throw new NotFoundException('Tâche introuvable');

    const updateData: any = {
      status: data.status ?? undefined,
      priority: data.priority ?? undefined,
      notes: data.notes ?? undefined,
      assignedToId: data.assignedToId ?? undefined,
      dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
    };

    if (data.status === 'DONE' && task.status !== 'DONE') {
      updateData.completedAt = new Date();
      await this.prisma.room.update({
        where: { id: task.roomId },
        data: { status: 'AVAILABLE' },
      });
    }

    return this.prisma.housekeepingTask.update({
      where: { id },
      data: updateData,
      include: { room: true, assignedTo: true },
    });
  }

  async removeHousekeeping(user: any, id: string) {
    if (!this.canWrite(user)) throw new ForbiddenException('Accès refusé');
    return this.prisma.housekeepingTask.delete({ where: { id } });
  }

  // ==========================================
  // FOLIO (extras)
  // ==========================================
  async getFolio(user: any, reservationId: string) {
    const orgId = await this.getOrganizationId(user);
    const reservation = await this.prisma.reservation.findFirst({
      where: { id: reservationId, organizationId: orgId },
      include: {
        customer: true,
        room: { include: { roomType: true } },
        folioCharges: { orderBy: { date: 'desc' } },
      },
    });
    if (!reservation) throw new NotFoundException('Réservation introuvable');

    const nights = Math.max(
      1,
      Math.ceil(
        (new Date(reservation.checkOutDate).getTime() - new Date(reservation.checkInDate).getTime()) /
          (1000 * 60 * 60 * 24)
      )
    );
    const roomTotal = (reservation.room?.roomType?.basePrice || 0) * nights;
    const extrasTotal = reservation.folioCharges.reduce((s, c) => s + c.total, 0);
    const grandTotal = roomTotal + extrasTotal;
    const solde = grandTotal - reservation.paidAmount;

    return {
      reservation,
      nights,
      roomTotal,
      extrasTotal,
      grandTotal,
      paid: reservation.paidAmount,
      solde,
    };
  }

  async addFolioCharge(user: any, reservationId: string, data: any) {
    if (!this.canWrite(user)) throw new ForbiddenException('Accès refusé');
    const orgId = await this.getOrganizationId(user);

    const reservation = await this.prisma.reservation.findFirst({
      where: { id: reservationId, organizationId: orgId },
    });
    if (!reservation) throw new NotFoundException('Réservation introuvable');

    const quantity = parseInt(data.quantity) || 1;
    const unitPrice = parseFloat(data.unitPrice) || 0;

    return this.prisma.folioCharge.create({
      data: {
        reservationId,
        description: data.description,
        category: data.category || 'OTHER',
        quantity,
        unitPrice,
        total: quantity * unitPrice,
        organizationId: orgId,
      },
    });
  }

  async removeFolioCharge(user: any, id: string) {
    if (!this.canWrite(user)) throw new ForbiddenException('Accès refusé');
    return this.prisma.folioCharge.delete({ where: { id } });
  }

  // ==========================================
  // RESTAURANT
  // ==========================================
  async findAllMenu(user: any) {
    const orgId = await this.getOrganizationId(user);
    return this.prisma.menuItem.findMany({
      where: { organizationId: orgId },
      orderBy: [{ category: 'asc' }, { name: 'asc' }],
    });
  }

  async createMenuItem(user: any, data: any) {
    if (!this.canWrite(user)) throw new ForbiddenException('Accès refusé');
    const orgId = await this.getOrganizationId(user);
    return this.prisma.menuItem.create({
      data: {
        name: data.name,
        description: data.description || null,
        category: data.category || null,
        price: parseFloat(data.price) || 0,
        isAvailable: data.isAvailable !== false,
        organizationId: orgId,
      },
    });
  }

  async updateMenuItem(user: any, id: string, data: any) {
    if (!this.canWrite(user)) throw new ForbiddenException('Accès refusé');
    return this.prisma.menuItem.update({
      where: { id },
      data: {
        name: data.name ?? undefined,
        description: data.description ?? undefined,
        category: data.category ?? undefined,
        price: data.price !== undefined ? parseFloat(data.price) : undefined,
        isAvailable: data.isAvailable ?? undefined,
      },
    });
  }

  async removeMenuItem(user: any, id: string) {
    if (!this.canWrite(user)) throw new ForbiddenException('Accès refusé');
    return this.prisma.menuItem.delete({ where: { id } });
  }

  async findAllOrders(user: any, status?: string) {
    const orgId = await this.getOrganizationId(user);
    return this.prisma.restaurantOrder.findMany({
      where: { organizationId: orgId, ...(status ? { status } : {}) },
      include: {
        items: { include: { menuItem: true } },
        reservation: { include: { customer: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createOrder(user: any, data: any) {
    if (!this.canWrite(user)) throw new ForbiddenException('Accès refusé');
    const orgId = await this.getOrganizationId(user);

    const items = data.items || [];
    if (items.length === 0) throw new BadRequestException('Aucun article');

    let total = 0;
    const itemsToCreate: any[] = [];
    for (const it of items) {
      const menuItem = await this.prisma.menuItem.findUnique({ where: { id: it.menuItemId } });
      if (!menuItem) throw new NotFoundException(`Menu item ${it.menuItemId} introuvable`);
      const qty = parseInt(it.quantity) || 1;
      const lineTotal = qty * menuItem.price;
      total += lineTotal;
      itemsToCreate.push({
        menuItemId: it.menuItemId,
        quantity: qty,
        unitPrice: menuItem.price,
        total: lineTotal,
      });
    }

    return this.prisma.restaurantOrder.create({
      data: {
        reservationId: data.reservationId || null,
        roomNumber: data.roomNumber || null,
        notes: data.notes || null,
        total,
        organizationId: orgId,
        items: { create: itemsToCreate },
      },
      include: { items: { include: { menuItem: true } } },
    });
  }

  async updateOrderStatus(user: any, id: string, status: string) {
    if (!this.canWrite(user)) throw new ForbiddenException('Accès refusé');
    return this.prisma.restaurantOrder.update({
      where: { id },
      data: { status },
    });
  }

  async removeOrder(user: any, id: string) {
    if (!this.canWrite(user)) throw new ForbiddenException('Accès refusé');
    return this.prisma.restaurantOrder.delete({ where: { id } });
  }

  // ==========================================
  // MAINTENANCE
  // ==========================================
  async findAllMaintenance(user: any) {
    const orgId = await this.getOrganizationId(user);
    return this.prisma.maintenanceTicket.findMany({
      where: { organizationId: orgId },
      include: {
        room: true,
        assignedTo: { select: { id: true, name: true, email: true } },
      },
      orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
    });
  }

  async createMaintenance(user: any, data: any) {
    if (!this.canWrite(user)) throw new ForbiddenException('Accès refusé');
    const orgId = await this.getOrganizationId(user);
    return this.prisma.maintenanceTicket.create({
      data: {
        title: data.title,
        description: data.description || null,
        priority: data.priority || 'NORMAL',
        status: data.status || 'OPEN',
        roomId: data.roomId || null,
        assignedToId: data.assignedToId || null,
        organizationId: orgId,
      },
      include: { room: true, assignedTo: true },
    });
  }

  async updateMaintenance(user: any, id: string, data: any) {
    if (!this.canWrite(user)) throw new ForbiddenException('Accès refusé');
    const updateData: any = {
      title: data.title ?? undefined,
      description: data.description ?? undefined,
      priority: data.priority ?? undefined,
      status: data.status ?? undefined,
      roomId: data.roomId ?? undefined,
      assignedToId: data.assignedToId ?? undefined,
    };
    if (data.status === 'RESOLVED') updateData.resolvedAt = new Date();
    return this.prisma.maintenanceTicket.update({
      where: { id },
      data: updateData,
      include: { room: true, assignedTo: true },
    });
  }

  async removeMaintenance(user: any, id: string) {
    if (!this.canWrite(user)) throw new ForbiddenException('Accès refusé');
    return this.prisma.maintenanceTicket.delete({ where: { id } });
  }

  // ==========================================
  // EXISTANTS (Rooms / RoomTypes / Reservations / Check-in/out / Dashboard)
  // ==========================================
  async findAllRoomTypes(user: any) {
    const orgId = await this.getOrganizationId(user);
    return this.prisma.roomType.findMany({
      where: { organizationId: orgId },
      include: { _count: { select: { rooms: true } } },
      orderBy: { basePrice: 'asc' },
    });
  }

  async createRoomType(user: any, data: any) {
    if (!this.canWrite(user)) throw new ForbiddenException('Accès refusé');
    const orgId = await this.getOrganizationId(user);
    return this.prisma.roomType.create({
      data: {
        name: data.name,
        description: data.description || null,
        capacity: data.capacity || 1,
        basePrice: data.basePrice || 0,
        organizationId: orgId,
      },
    });
  }

  async updateRoomType(user: any, id: string, data: any) {
    if (!this.canWrite(user)) throw new ForbiddenException('Accès refusé');
    return this.prisma.roomType.update({
      where: { id },
      data: {
        name: data.name ?? undefined,
        description: data.description ?? undefined,
        capacity: data.capacity ?? undefined,
        basePrice: data.basePrice ?? undefined,
      },
    });
  }

  async removeRoomType(user: any, id: string) {
    if (!this.canWrite(user)) throw new ForbiddenException('Accès refusé');
    const roomType = await this.prisma.roomType.findUnique({
      where: { id },
      include: { _count: { select: { rooms: true } } },
    });
    if (!roomType) throw new NotFoundException('Type introuvable');
    if (roomType._count.rooms > 0) throw new BadRequestException('Des chambres utilisent ce type');
    return this.prisma.roomType.delete({ where: { id } });
  }

  async findAllRooms(user: any) {
    const orgId = await this.getOrganizationId(user);
    return this.prisma.room.findMany({
      where: { organizationId: orgId },
      include: { roomType: true },
      orderBy: [{ floor: 'asc' }, { number: 'asc' }],
    });
  }

  async createRoom(user: any, data: any) {
    if (!this.canWrite(user)) throw new ForbiddenException('Accès refusé');
    const orgId = await this.getOrganizationId(user);
    const existing = await this.prisma.room.findFirst({
      where: { organizationId: orgId, number: data.number },
    });
    if (existing) throw new BadRequestException(`La chambre ${data.number} existe déjà.`);
    return this.prisma.room.create({
      data: {
        number: data.number,
        floor: data.floor ?? null,
        status: data.status || 'AVAILABLE',
        notes: data.notes || null,
        roomTypeId: data.roomTypeId,
        organizationId: orgId,
      },
      include: { roomType: true },
    });
  }

  async updateRoom(user: any, id: string, data: any) {
    if (!this.canWrite(user)) throw new ForbiddenException('Accès refusé');
    return this.prisma.room.update({
      where: { id },
      data: {
        number: data.number ?? undefined,
        floor: data.floor ?? undefined,
        status: data.status ?? undefined,
        notes: data.notes ?? undefined,
        roomTypeId: data.roomTypeId ?? undefined,
      },
      include: { roomType: true },
    });
  }

  async removeRoom(user: any, id: string) {
    if (!this.canWrite(user)) throw new ForbiddenException('Accès refusé');
    const room = await this.prisma.room.findUnique({
      where: { id },
      include: { _count: { select: { reservations: true } } },
    });
    if (!room) throw new NotFoundException('Chambre introuvable');
    if (room._count.reservations > 0) throw new BadRequestException('Réservations existantes');
    return this.prisma.room.delete({ where: { id } });
  }

  async findAllReservations(user: any, filters?: { status?: string; from?: string; to?: string }) {
    const orgId = await this.getOrganizationId(user);
    const where: any = { organizationId: orgId };
    if (filters?.status) where.status = filters.status;
    if (filters?.from || filters?.to) {
      where.checkInDate = {};
      if (filters.from) where.checkInDate.gte = new Date(filters.from);
      if (filters.to) where.checkInDate.lte = new Date(filters.to);
    }
    return this.prisma.reservation.findMany({
      where,
      include: { customer: true, room: { include: { roomType: true } } },
      orderBy: { checkInDate: 'desc' },
    });
  }

  async findOneReservation(user: any, id: string) {
    const orgId = await this.getOrganizationId(user);
    const r = await this.prisma.reservation.findFirst({
      where: { id, organizationId: orgId },
      include: { customer: true, room: { include: { roomType: true } } },
    });
    if (!r) throw new NotFoundException('Réservation introuvable');
    return r;
  }

  private async generateReference(orgId: string): Promise<string> {
    const year = new Date().getFullYear();
    const count = await this.prisma.reservation.count({ where: { organizationId: orgId } });
    return `RES-${year}-${String(count + 1).padStart(4, '0')}`;
  }

  private computeNights(checkIn: Date, checkOut: Date): number {
    return Math.max(1, Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24)));
  }

  async createReservation(user: any, data: any) {
    if (!this.canWrite(user)) throw new ForbiddenException('Accès refusé');
    const orgId = await this.getOrganizationId(user);
    const checkIn = new Date(data.checkInDate);
    const checkOut = new Date(data.checkOutDate);
    if (checkOut <= checkIn) throw new BadRequestException('Dates invalides');

    const room = await this.prisma.room.findFirst({
      where: { id: data.roomId, organizationId: orgId },
      include: { roomType: true },
    });
    if (!room) throw new NotFoundException('Chambre introuvable');

    const conflict = await this.prisma.reservation.findFirst({
      where: {
        roomId: data.roomId,
        status: { in: ['PENDING', 'CONFIRMED', 'CHECKED_IN'] },
        AND: [{ checkInDate: { lt: checkOut } }, { checkOutDate: { gt: checkIn } }],
      },
    });
    if (conflict) throw new BadRequestException(`Chambre ${room.number} déjà réservée`);

    const nights = this.computeNights(checkIn, checkOut);
    const totalAmount = data.totalAmount ?? nights * (room.roomType?.basePrice || 0);
    const reference = await this.generateReference(orgId);

    return this.prisma.reservation.create({
      data: {
        reference,
        checkInDate: checkIn,
        checkOutDate: checkOut,
        adults: data.adults || 1,
        children: data.children || 0,
        status: data.status || 'PENDING',
        totalAmount,
        paidAmount: data.paidAmount || 0,
        notes: data.notes || null,
        customerId: data.customerId,
        roomId: data.roomId,
        organizationId: orgId,
      },
      include: { customer: true, room: { include: { roomType: true } } },
    });
  }

  async updateReservation(user: any, id: string, data: any) {
    if (!this.canWrite(user)) throw new ForbiddenException('Accès refusé');
    await this.findOneReservation(user, id);
    const checkIn = data.checkInDate ? new Date(data.checkInDate) : undefined;
    const checkOut = data.checkOutDate ? new Date(data.checkOutDate) : undefined;
    if (checkIn && checkOut && checkOut <= checkIn) throw new BadRequestException('Dates invalides');

    return this.prisma.reservation.update({
      where: { id },
      data: {
        checkInDate: checkIn,
        checkOutDate: checkOut,
        adults: data.adults ?? undefined,
        children: data.children ?? undefined,
        status: data.status ?? undefined,
        totalAmount: data.totalAmount ?? undefined,
        paidAmount: data.paidAmount ?? undefined,
        notes: data.notes ?? undefined,
        roomId: data.roomId ?? undefined,
        customerId: data.customerId ?? undefined,
      },
      include: { customer: true, room: { include: { roomType: true } } },
    });
  }

  async removeReservation(user: any, id: string) {
    if (!this.canWrite(user)) throw new ForbiddenException('Accès refusé');
    await this.findOneReservation(user, id);
    return this.prisma.reservation.delete({ where: { id } });
  }

  async checkIn(user: any, id: string) {
    if (!this.canWrite(user)) throw new ForbiddenException('Accès refusé');
    const r = await this.findOneReservation(user, id);
    if (!['CONFIRMED', 'PENDING'].includes(r.status)) {
      throw new BadRequestException('Check-in impossible');
    }
    return this.prisma.$transaction(async (tx) => {
      await tx.room.update({ where: { id: r.roomId }, data: { status: 'OCCUPIED' } });
      return tx.reservation.update({
        where: { id },
        data: { status: 'CHECKED_IN', checkedInAt: new Date() },
        include: { customer: true, room: { include: { roomType: true } } },
      });
    });
  }

  async checkOut(user: any, id: string) {
    if (!this.canWrite(user)) throw new ForbiddenException('Accès refusé');
    const r = await this.findOneReservation(user, id);
    if (r.status !== 'CHECKED_IN') throw new BadRequestException('Pas en cours');
    return this.prisma.$transaction(async (tx) => {
      await tx.room.update({ where: { id: r.roomId }, data: { status: 'CLEANING' } });
      return tx.reservation.update({
        where: { id },
        data: { status: 'CHECKED_OUT', checkedOutAt: new Date() },
        include: { customer: true, room: { include: { roomType: true } } },
      });
    });
  }

  async getDashboard(user: any) {
    const orgId = await this.getOrganizationId(user);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const [totalRooms, availableRooms, occupiedRooms, arrivals, departures, inHouse, pending, hkPending] =
      await Promise.all([
        this.prisma.room.count({ where: { organizationId: orgId } }),
        this.prisma.room.count({ where: { organizationId: orgId, status: 'AVAILABLE' } }),
        this.prisma.room.count({ where: { organizationId: orgId, status: 'OCCUPIED' } }),
        this.prisma.reservation.count({
          where: {
            organizationId: orgId,
            checkInDate: { gte: today, lt: tomorrow },
            status: { in: ['PENDING', 'CONFIRMED'] },
          },
        }),
        this.prisma.reservation.count({
          where: {
            organizationId: orgId,
            checkOutDate: { gte: today, lt: tomorrow },
            status: 'CHECKED_IN',
          },
        }),
        this.prisma.reservation.count({ where: { organizationId: orgId, status: 'CHECKED_IN' } }),
        this.prisma.reservation.count({ where: { organizationId: orgId, status: 'PENDING' } }),
        this.prisma.housekeepingTask.count({
          where: { organizationId: orgId, status: { in: ['PENDING', 'IN_PROGRESS'] } },
        }),
      ]);

    return {
      totalRooms, availableRooms, occupiedRooms, arrivals, departures, inHouse, pending, hkPending,
      occupancyRate: totalRooms > 0 ? Math.round((occupiedRooms / totalRooms) * 100) : 0,
    };
  }

  async getArrivalsDepartures(user: any) {
    const orgId = await this.getOrganizationId(user);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const [arrivals, departures] = await Promise.all([
      this.prisma.reservation.findMany({
        where: {
          organizationId: orgId,
          checkInDate: { gte: today, lt: tomorrow },
          status: { in: ['PENDING', 'CONFIRMED'] },
        },
        include: { customer: true, room: { include: { roomType: true } } },
      }),
      this.prisma.reservation.findMany({
        where: {
          organizationId: orgId,
          checkOutDate: { gte: today, lt: tomorrow },
          status: 'CHECKED_IN',
        },
        include: { customer: true, room: { include: { roomType: true } } },
      }),
    ]);

    return { arrivals, departures };
  }

  // ═══════════════════════════════════════════════════════
  //  NIGHT AUDIT — Rapport journalier hôtel
  // ═══════════════════════════════════════════════════════
  async getNightAudit(user: any, dateStr: string) {
    const orgId = await this.getOrganizationId(user);

    if (!dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      throw new BadRequestException('Date invalide (format attendu : YYYY-MM-DD)');
    }

    const dayStart = new Date(`${dateStr}T00:00:00.000Z`);
    const dayEnd = new Date(`${dateStr}T23:59:59.999Z`);
    if (isNaN(dayStart.getTime())) {
      throw new BadRequestException('Date invalide');
    }

    // ─── 1. Chambres ──────────────────────────────────────
    const [totalRooms, oooRooms] = await Promise.all([
      this.prisma.room.count({ where: { organizationId: orgId } }),
      this.prisma.room.count({
        where: {
          organizationId: orgId,
          status: { in: ['OUT_OF_ORDER', 'MAINTENANCE'] },
        },
      }),
    ]);

    // ─── 2. Réservations couvrant la nuit ─────────────────
    const soldReservations = await this.prisma.reservation.findMany({
      where: {
        organizationId: orgId,
        status: { in: ['CHECKED_IN', 'CHECKED_OUT'] },
        checkInDate: { lte: dayEnd },
        checkOutDate: { gt: dayStart },
      },
      include: {
        room: { include: { roomType: { select: { name: true, basePrice: true } } } },
      },
    });

    const roomsSold = soldReservations.length;

    // Revenu chambre de la nuit = totalAmount / nuits (split équitable)
    let roomRevenue = 0;
    for (const r of soldReservations) {
      const nights = Math.max(
        1,
        Math.ceil((r.checkOutDate.getTime() - r.checkInDate.getTime()) / 86400000),
      );
      roomRevenue += (r.totalAmount || 0) / nights;
    }

    const occupancyRate = totalRooms > 0 ? (roomsSold / totalRooms) * 100 : 0;
    const adr = roomsSold > 0 ? roomRevenue / roomsSold : 0;
    const revpar = totalRooms > 0 ? roomRevenue / totalRooms : 0;
    const roomsAvailable = Math.max(0, totalRooms - roomsSold - oooRooms);

    // ─── 3. Mouvements du jour ────────────────────────────
    const [arrivals, departures, noShows, inHouseCount] = await Promise.all([
      this.prisma.reservation.count({
        where: {
          organizationId: orgId,
          checkInDate: { gte: dayStart, lte: dayEnd },
        },
      }),
      this.prisma.reservation.count({
        where: {
          organizationId: orgId,
          checkOutDate: { gte: dayStart, lte: dayEnd },
        },
      }),
      this.prisma.reservation.count({
        where: {
          organizationId: orgId,
          checkInDate: { gte: dayStart, lte: dayEnd },
          status: 'NO_SHOW',
        },
      }),
      this.prisma.reservation.count({
        where: {
          organizationId: orgId,
          status: 'CHECKED_IN',
          checkInDate: { lte: dayEnd },
          checkOutDate: { gt: dayStart },
        },
      }),
    ]);

    // ─── 4. Revenus restaurant ────────────────────────────
    const orderPayments = await this.prisma.orderPayment.findMany({
      where: {
        order: { organizationId: orgId },
        createdAt: { gte: dayStart, lte: dayEnd },
      },
    });
    const restaurantRevenue = orderPayments.reduce((s, p) => s + p.amount, 0);

    // ─── 5. Revenus extras (folio) ────────────────────────
    const folioCharges = await this.prisma.folioCharge.findMany({
      where: {
        organizationId: orgId,
        date: { gte: dayStart, lte: dayEnd },
      },
    });
    const extrasRevenue = folioCharges.reduce((s, c) => s + c.total, 0);

    const totalRevenue = roomRevenue + restaurantRevenue + extrasRevenue;

    // ─── 6. Paiements par méthode ─────────────────────────
    const paymentsByMethod: Record<string, number> = {};
    orderPayments.forEach((p) => {
      paymentsByMethod[p.method] = (paymentsByMethod[p.method] || 0) + p.amount;
    });

    // ─── 7. Soldes à recouvrer ────────────────────────────
    // 7a. Clients déjà partis avec solde > 0
    const departed = await this.prisma.reservation.findMany({
      where: {
        organizationId: orgId,
        status: 'CHECKED_OUT',
        checkOutDate: { lte: dayEnd },
      },
      include: {
        customer: {
          select: { firstName: true, lastName: true, phone: true },
        },
        room: { select: { number: true } },
      },
    });

    const departedUnpaid = departed
      .map((r) => ({
        id: r.id,
        reference: r.reference,
        customer: `${r.customer?.firstName || ''} ${r.customer?.lastName || ''}`.trim(),
        phone: r.customer?.phone,
        room: r.room?.number,
        checkOutDate: r.checkOutDate,
        total: r.totalAmount,
        paid: r.paidAmount,
        balance: r.totalAmount - r.paidAmount,
      }))
      .filter((x) => x.balance > 0.01);

    // 7b. Clients en séjour avec solde > 0
    const inHouse = await this.prisma.reservation.findMany({
      where: {
        organizationId: orgId,
        status: 'CHECKED_IN',
        checkInDate: { lte: dayEnd },
        checkOutDate: { gt: dayStart },
      },
      include: {
        customer: {
          select: { firstName: true, lastName: true, phone: true },
        },
        room: { include: { roomType: { select: { name: true, basePrice: true } } } },
        folioCharges: true,
      },
    });

    const inHouseUnpaid = inHouse
      .map((r) => {
        const nights = Math.max(
          1,
          Math.ceil((r.checkOutDate.getTime() - r.checkInDate.getTime()) / 86400000),
        );
        const roomTotal = nights * (r.room?.roomType?.basePrice || 0);
        const extrasTotal = r.folioCharges.reduce((s, c) => s + c.total, 0);
        const grandTotal = roomTotal + extrasTotal;
        return {
          id: r.id,
          reference: r.reference,
          customer: `${r.customer?.firstName || ''} ${r.customer?.lastName || ''}`.trim(),
          phone: r.customer?.phone,
          room: r.room?.number,
          checkInDate: r.checkInDate,
          checkOutDate: r.checkOutDate,
          nights,
          roomTotal,
          extrasTotal,
          grandTotal,
          paid: r.paidAmount,
          balance: grandTotal - r.paidAmount,
        };
      })
      .filter((x) => x.balance > 0.01);

    const totalDepartedUnpaid = departedUnpaid.reduce((s, x) => s + x.balance, 0);
    const totalInHouseUnpaid = inHouseUnpaid.reduce((s, x) => s + x.balance, 0);

    return {
      date: dateStr,
      generatedAt: new Date().toISOString(),
      organization: null, // optionnel : à ajouter plus tard
      summary: {
        totalRooms,
        roomsSold,
        roomsAvailable,
        roomsOoo: oooRooms,
        occupancyRate: Math.round(occupancyRate * 100) / 100,
        arrivals,
        departures,
        noShows,
        inHouse: inHouseCount,
      },
      revenue: {
        rooms: Math.round(roomRevenue),
        restaurant: Math.round(restaurantRevenue),
        extras: Math.round(extrasRevenue),
        total: Math.round(totalRevenue),
        adr: Math.round(adr),
        revpar: Math.round(revpar),
      },
      paymentsByMethod,
      unpaid: {
        departed: departedUnpaid,
        inHouse: inHouseUnpaid,
        totalDeparted: Math.round(totalDepartedUnpaid),
        totalInHouse: Math.round(totalInHouseUnpaid),
        total: Math.round(totalDepartedUnpaid + totalInHouseUnpaid),
      },
    };
  }
}
