import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  UseGuards,
  Res,
} from '@nestjs/common';
import type { Response } from 'express';
import { StorageService } from './storage.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';

@Controller('storage')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class StorageController {
  constructor(private readonly service: StorageService) {}

  @Get()
  findAll() {
    return this.service.findAll();
  }

  @Post('recalc')
  recalc() {
    return this.service.recalcAll();
  }

  @Get('size/:organizationId')
  getSize(@Param('organizationId') organizationId: string) {
    return this.service.computeOrgSize(organizationId);
  }

  @Get('backups')
  getAllBackups() {
    return this.service.getAllBackups();
  }

  @Get('organization/:organizationId')
  findByOrganization(@Param('organizationId') organizationId: string) {
    return this.service.findByOrganization(organizationId);
  }

  @Get('organization/:organizationId/backups')
  getBackups(@Param('organizationId') organizationId: string) {
    return this.service.getBackups(organizationId);
  }

  @Get('backup/:id/download')
  downloadBackup(@Param('id') id: string, @Res() res: Response) {
    return this.service.downloadBackup(id, res);
  }

  @Post()
  upsert(@Body() body: any) {
    return this.service.upsert(body);
  }

  @Patch('organization/:organizationId/usage')
  updateUsage(@Param('organizationId') organizationId: string, @Body() body: any) {
    return this.service.updateUsage(organizationId, body.usedStorage);
  }

  @Patch('organization/:organizationId/backup')
  recordBackup(@Param('organizationId') organizationId: string) {
    return this.service.recordBackup(organizationId);
  }
}
