import {
  Controller, Get, Post, Patch, Delete, Param, Body, UseGuards, Req,
} from '@nestjs/common';
import { OrganizationsService } from './organizations.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { UpdateOrganizationDto } from './dto/update-organization.dto';
import { SuspendOrganizationDto } from './dto/suspend-organization.dto';

@Controller('organizations')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class OrganizationsController {
  constructor(private readonly service: OrganizationsService) {}

  @Get()
  findAll() {
    return this.service.findAll();
  }

  @Get('clients')
  findClientOrganizations() {
    return this.service.findClientOrganizations();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Post()
  create(@Body() dto: CreateOrganizationDto, @Req() req: any) {
    return this.service.create(dto, req.user);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateOrganizationDto,
    @Req() req: any,
  ) {
    return this.service.update(id, dto, req.user);
  }

  // ═══════════════════════════════════════════════════════════
  //  SUSPENSION / RÉACTIVATION
  // ═══════════════════════════════════════════════════════════

  @Patch(':id/suspend')
  suspend(
    @Param('id') id: string,
    @Body() dto: SuspendOrganizationDto,
    @Req() req: any,
  ) {
    return this.service.suspend(id, dto.reason, req.user);
  }

  @Patch(':id/reactivate')
  reactivate(@Param('id') id: string, @Req() req: any) {
    return this.service.reactivate(id, req.user);
  }

  // ═══ Impersonation ═══
  @Post(':id/impersonate')
  impersonate(@Param('id') id: string, @Req() req: any) {
    return this.service.impersonate(id, req.user);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Req() req: any) {
    return this.service.remove(id, req.user);
  }
}
