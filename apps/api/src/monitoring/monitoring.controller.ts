import { Controller, Get, Req, ForbiddenException, UseGuards } from '@nestjs/common';
import { MonitoringService } from './monitoring.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';

@Controller('monitoring')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class MonitoringController {
  constructor(private readonly service: MonitoringService) {}

  private assertSuperAdmin(req: any) {
    const u = req.user;
    if (!(u.role === 'SUPER_ADMIN' && u.isOwner)) {
      throw new ForbiddenException('Accès réservé au Super Admin');
    }
  }

  @Get('metrics')
  metrics(@Req() req: any) {
    this.assertSuperAdmin(req);
    return this.service.getMetrics();
  }

  @Get('data-stats')
  dataStats(@Req() req: any) {
    this.assertSuperAdmin(req);
    return this.service.getDataStats();
  }
}
