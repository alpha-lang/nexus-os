import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class BillingConfigService {
  constructor(private prisma: PrismaService) {}

  private assertSuperAdmin(user: any) {
    if (!(user.role === 'SUPER_ADMIN' && user.isOwner)) {
      throw new ForbiddenException('Réservé au Super Admin');
    }
  }

  /**
   * Super Admin : voit la config de n'importe quelle org
   */
  async getByOrg(organizationId: string, user: any) {
    this.assertSuperAdmin(user);

    const org = await this.prisma.organization.findUnique({
      where: { id: organizationId },
      select: { id: true, name: true },
    });
    if (!org) throw new NotFoundException('Organisation introuvable');

    let config = await this.prisma.billingConfig.findUnique({
      where: { organizationId },
    });

    // Auto-création si absente
    if (!config) {
      config = await this.prisma.billingConfig.create({
        data: {
          organizationId,
          legalName: org.name,
        },
      });
    }

    return config;
  }

  async upsert(organizationId: string, data: any, user: any) {
    this.assertSuperAdmin(user);

    const org = await this.prisma.organization.findUnique({
      where: { id: organizationId },
      select: { id: true, name: true },
    });
    if (!org) throw new NotFoundException('Organisation introuvable');

    const payload = {
      legalName: data.legalName?.trim() || null,
      taxId: data.taxId?.trim() || null,
      vatNumber: data.vatNumber?.trim() || null,
      addressLine1: data.addressLine1?.trim() || null,
      addressLine2: data.addressLine2?.trim() || null,
      postalCode: data.postalCode?.trim() || null,
      city: data.city?.trim() || null,
      country: data.country?.trim() || 'Madagascar',
      vatEnabled: !!data.vatEnabled,
      vatRate: data.vatRate != null ? parseFloat(data.vatRate) : 20,
      vatLabel: data.vatLabel?.trim() || 'TVA',
      invoicePrefix: (data.invoicePrefix?.trim() || 'FAC').toUpperCase(),
      invoiceFooter: data.invoiceFooter?.trim() || null,
      paymentTerms: data.paymentTerms?.trim() || 'Paiement à réception de facture',
      logoUrl: data.logoUrl?.trim() || null,
      primaryColor: data.primaryColor || '#0f172a',
    };

    return this.prisma.billingConfig.upsert({
      where: { organizationId },
      update: payload,
      create: { organizationId, ...payload },
    });
  }

  async remove(organizationId: string, user: any) {
    this.assertSuperAdmin(user);
    await this.prisma.billingConfig.deleteMany({ where: { organizationId } });
    return { success: true };
  }

  /**
   * Aperçu d'une facture : renvoie les données nécessaires au rendu
   * (numérotation, montants HT/TVA/TTC, etc.)
   */
  async previewInvoice(organizationId: string, data: any, user: any) {
    this.assertSuperAdmin(user);
    const config = await this.getByOrg(organizationId, user);

    const subtotal = parseFloat(data.subtotal) || 0;
    const vatAmount = config.vatEnabled ? subtotal * (config.vatRate / 100) : 0;
    const total = subtotal + vatAmount;

    // Numérotation : PREFIX-YYYY-NNNN
    const year = new Date().getFullYear();
    const count = await this.prisma.payment.count({
      where: { organizationId },
    });
    const number = `${config.invoicePrefix}-${year}-${String(count + 1).padStart(4, '0')}`;

    return {
      number,
      date: new Date().toISOString(),
      config,
      billing: {
        subtotal,
        vatAmount,
        vatRate: config.vatEnabled ? config.vatRate : 0,
        vatLabel: config.vatLabel,
        total,
      },
    };
  }
}
