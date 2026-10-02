import { Controller, Get, Post, Patch, Delete, Param, Body, UseGuards, Req } from '@nestjs/common';
import { ChangelogService } from './changelog.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';

@Controller('changelog')
export class ChangelogController {
  constructor(private readonly service: ChangelogService) {}

  @Get('public')
  getPublic() { return this.service.getPublic(); }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Get()
  findAll(@Req() req: any) { return this.service.findAll(req.user); }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Post()
  create(@Req() req: any, @Body() b: any) { return this.service.create(req.user, b); }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Patch(':id')
  update(@Req() req: any, @Param('id') id: string, @Body() b: any) { return this.service.update(req.user, id, b); }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Delete(':id')
  remove(@Req() req: any, @Param('id') id: string) { return this.service.remove(req.user, id); }
}
