import {
  Controller, Get, Post, Patch, Delete, Param, Body, UseGuards, Req, Res,
} from '@nestjs/common';
import type { Response } from 'express';
import { BillingConfigService } from './billing-config.service';
import { renderInvoiceHtml } from './invoice-renderer';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';

@Controller('billing-config')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class BillingConfigController {
  constructor(private readonly service: BillingConfigService) {}

  @Get('organization/:organizationId')
  getByOrg(@Param('organizationId') organizationId: string, @Req() req: any) {
    return this.service.getByOrg(organizationId, req.user);
  }

  @Post('organization/:organizationId')
  upsert(
    @Param('organizationId') organizationId: string,
    @Body() body: any,
    @Req() req: any,
  ) {
    return this.service.upsert(organizationId, body, req.user);
  }

  @Delete('organization/:organizationId')
  remove(@Param('organizationId') organizationId: string, @Req() req: any) {
    return this.service.remove(organizationId, req.user);
  }

  @Post('organization/:organizationId/preview')
  preview(
    @Param('organizationId') organizationId: string,
    @Body() body: any,
    @Req() req: any,
  ) {
    return this.service.previewInvoice(organizationId, body, req.user);
  }

  /**
   * Génère le HTML de la facture (prêt à imprimer en PDF côté navigateur).
   */
  @Post('organization/:organizationId/preview-html')
  async previewHtml(
    @Param('organizationId') organizationId: string,
    @Body() body: any,
    @Res() res: Response,
  ) {
    const data = await this.service.previewInvoice(
      organizationId,
      body,
      { role: 'SUPER_ADMIN', isOwner: true },
    );

    const html = renderInvoiceHtml({
      number: data.number,
      date: data.date,
      organization: {
        name: data.config.legalName || body.organizationName || 'Organisation',
        legalName: data.config.legalName,
        addressLine1: data.config.addressLine1,
        addressLine2: data.config.addressLine2,
        postalCode: data.config.postalCode,
        city: data.config.city,
        country: data.config.country,
        taxId: data.config.taxId,
        vatNumber: data.config.vatNumber,
        email: null,
        phone: null,
      },
      customer: body.customer || { name: 'Client' },
      items: body.items || [],
      vatEnabled: data.config.vatEnabled,
      vatRate: data.billing.vatRate,
      vatLabel: data.billing.vatLabel,
      subtotal: data.billing.subtotal,
      vatAmount: data.billing.vatAmount,
      total: data.billing.total,
      footer: data.config.invoiceFooter,
      paymentTerms: data.config.paymentTerms,
      logoUrl: data.config.logoUrl,
      primaryColor: data.config.primaryColor,
    });

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(html);
  }
}
