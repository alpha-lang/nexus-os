import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class MaintenanceService {
  constructor(private prisma: PrismaService) {}

  async get() {
    let w = await this.prisma.maintenanceWindow.findFirst({ orderBy: { createdAt: 'desc' } });
    if (!w) {
      w = await this.prisma.maintenanceWindow.create({
        data: { isActive: false, message: 'La plateforme est en maintenance. Merci de revenir dans quelques minutes.' },
      });
    }
    return w;
  }

  async update(user: any, data: any) {
    const current = await this.get();
    return this.prisma.maintenanceWindow.update({
      where: { id: current.id },
      data: {
        isActive: data.isActive ?? undefined,
        message: data.message ?? undefined,
        scheduledStart: data.scheduledStart !== undefined
          ? (data.scheduledStart ? new Date(data.scheduledStart) : null)
          : undefined,
        scheduledEnd: data.scheduledEnd !== undefined
          ? (data.scheduledEnd ? new Date(data.scheduledEnd) : null)
          : undefined,
        createdById: user?.userId || undefined,
      },
    });
  }

  /**
   * Vrai si la maintenance est active (manuelle OU planifiée).
   */
  async isMaintenanceOn(): Promise<{ on: boolean; message: string; scheduledEnd: Date | null }> {
    const w = await this.get();
    const now = new Date();
    const scheduled = w.scheduledStart && w.scheduledEnd
      && now >= w.scheduledStart && now <= w.scheduledEnd;
    const on = w.isActive || !!scheduled;
    return { on, message: w.message, scheduledEnd: w.scheduledEnd };
  }
}
