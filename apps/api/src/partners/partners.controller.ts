import {
  Controller, Get, Post, Patch, Delete, Param, Body, Query, UseGuards,
} from '@nestjs/common';
import { CustomersService } from '../customers/customers.service';
import { ApiKeyOrJwtGuard } from '../common/guards/api-key.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { ScopeGuard } from '../common/guards/scope.guard';
import { RequireScope } from '../common/decorators/require-scope.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('partners')
@UseGuards(ApiKeyOrJwtGuard, PermissionsGuard, ScopeGuard)
export class PartnersController {
  constructor(private readonly service: CustomersService) {}

  @Get()
  @RequireScope('READ')
  findAll(
    @CurrentUser() u: any,
    @Query('type') type?: string,
    @Query('cursor') cursor?: string,
    @Query('take') take?: string,
    @Query('search') search?: string,
  ) {
    return this.service.findAllPartners(u, {
      type, cursor,
      take: take ? parseInt(take, 10) : undefined,
      search,
    });
  }

  @Get(':id/full')
  @RequireScope('READ')
  findFull(@CurrentUser() u: any, @Param('id') id: string) {
    return this.service.findFullPartner(u, id);
  }

  @Get(':id')
  @RequireScope('READ')
  findOne(@CurrentUser() u: any, @Param('id') id: string) {
    return this.service.findOnePartner(u, id);
  }

  @Post()
  @RequireScope('WRITE')
  create(@CurrentUser() u: any, @Body() b: any) {
    return this.service.createPartner(u, b);
  }

  @Patch(':id')
  @RequireScope('WRITE')
  update(@CurrentUser() u: any, @Param('id') id: string, @Body() b: any) {
    return this.service.update(id, b, u);
  }

  @Delete(':id')
  @RequireScope('ADMIN')
  remove(@CurrentUser() u: any, @Param('id') id: string) {
    return this.service.remove(id, u);
  }
}
