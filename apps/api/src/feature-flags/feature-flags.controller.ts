import { Controller, Get, Post, Patch, Delete, Param, Body, UseGuards, Req } from '@nestjs/common';
import { FeatureFlagsService } from './feature-flags.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';

@Controller('feature-flags')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class FeatureFlagsController {
  constructor(private readonly service: FeatureFlagsService) {}

  @Get('my')
  my(@Req() req: any) { return this.service.getMyFlags(req.user); }

  @Get()
  findAll(@Req() req: any) { return this.service.findAll(req.user); }

  @Post()
  create(@Req() req: any, @Body() b: any) { return this.service.create(req.user, b); }

  @Patch(':id')
  update(@Req() req: any, @Param('id') id: string, @Body() b: any) { return this.service.update(req.user, id, b); }

  @Delete(':id')
  remove(@Req() req: any, @Param('id') id: string) { return this.service.remove(req.user, id); }

  @Patch(':id/override/:organizationId')
  setOverride(
    @Req() req: any,
    @Param('id') flagId: string,
    @Param('organizationId') organizationId: string,
    @Body() b: { enabled: boolean },
  ) {
    return this.service.setOverride(req.user, flagId, organizationId, b.enabled);
  }

  @Delete(':id/override/:organizationId')
  removeOverride(
    @Req() req: any,
    @Param('id') flagId: string,
    @Param('organizationId') organizationId: string,
  ) {
    return this.service.removeOverride(req.user, flagId, organizationId);
  }
}
