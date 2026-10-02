import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { AuditService } from './audit.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';

@Controller('audit-logs')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class AuditController {
  constructor(private readonly service: AuditService) {}

  @Get()
  findAll(@Query() q: any) {
    return this.service.findAll(q);
  }

  @Get('stats')
  stats(@Query('days') days?: string) {
    return this.service.getStats(days ? parseInt(days) : 7);
  }

  @Get('entities')
  entities() {
    return this.service.getEntityTypes();
  }
}
