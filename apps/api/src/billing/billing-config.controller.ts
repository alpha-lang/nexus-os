import { Controller, Get, Post, Patch, Delete, Param, Body, UseGuards, Req } from '@nestjs/common';
import { BillingConfigService } from './billing-config.service';
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
}
