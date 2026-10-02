import { Controller, Get, Patch, Body, UseGuards, Req } from '@nestjs/common';
import { MaintenanceService } from './maintenance.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';

@Controller('maintenance')
export class MaintenanceController {
  constructor(private readonly service: MaintenanceService) {}

  // Public : utilisé par le middleware et la page /maintenance
  @Get('status')
  status() { return this.service.isMaintenanceOn(); }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Get()
  get() { return this.service.get(); }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Patch()
  update(@Req() req: any, @Body() b: any) { return this.service.update(req.user, b); }
}
