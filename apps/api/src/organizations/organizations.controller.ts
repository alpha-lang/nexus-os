import { Controller, Get, Post, Patch, Delete, Param, Body, UseGuards } from '@nestjs/common';
import { OrganizationsService } from './organizations.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';

@Controller('organizations')
@UseGuards(JwtAuthGuard, PermissionsGuard) // ← Ajout de PermissionsGuard
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
  create(@Body() body: any) {
    return this.service.create(body);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() body: any) {
    return this.service.update(id, body);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
