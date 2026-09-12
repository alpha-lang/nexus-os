import { Controller, Get, Post, Patch, Delete, Param, Body, UseGuards } from '@nestjs/common';
import { BillingService } from './billing.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';

@Controller('billing')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class BillingController {
  constructor(private readonly service: BillingService) {}

  @Get()
  findAll() {
    return this.service.findAll();
  }

  @Get('organization/:organizationId')
  findByOrganization(@Param('organizationId') organizationId: string) {
    return this.service.findByOrganization(organizationId);
  }

  // Route pour confirmer un paiement automatique
  @Patch('mark-paid/:id')
  markAsPaid(@Param('id') id: string) {
    return this.service.markAsPaid(id);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
