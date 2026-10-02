import { Controller, Get, Post, Patch, Delete, Param, Body, UseGuards, Req } from '@nestjs/common';
import { ApiKeysService } from './api-keys.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';

@Controller('api-keys')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class ApiKeysController {
  constructor(private readonly service: ApiKeysService) {}

  @Get()
  findAll(@Req() req: any) { return this.service.findAll(req.user); }

  @Post()
  create(@Req() req: any, @Body() b: any) { return this.service.create(req.user, b); }

  @Patch(':id')
  update(@Req() req: any, @Param('id') id: string, @Body() b: any) { return this.service.update(req.user, id, b); }

  @Delete(':id')
  remove(@Req() req: any, @Param('id') id: string) { return this.service.remove(req.user, id); }

  // ═══ KILL SWITCH (Super Admin uniquement) ═══
  @Post(':id/kill-switch')
  killSwitch(@Req() req: any, @Param('id') id: string) { return this.service.killSwitch(req.user, id); }

  @Post(':id/reactivate')
  reactivate(@Req() req: any, @Param('id') id: string) { return this.service.reactivate(req.user, id); }
}
