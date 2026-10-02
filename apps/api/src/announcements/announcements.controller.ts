import { Controller, Get, Post, Patch, Delete, Param, Body, UseGuards, Req } from '@nestjs/common';
import { AnnouncementsService } from './announcements.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { Public } from '../common/decorators/public.decorator';

@Controller('announcements')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class AnnouncementsController {
  constructor(private readonly service: AnnouncementsService) {}

  @Public()
  @Get('active')
  getActive(@Req() req: any) { return this.service.getActive(req.user); }

  @Get()
  findAll(@Req() req: any) { return this.service.findAll(req.user); }

  @Post()
  create(@Req() req: any, @Body() b: any) { return this.service.create(req.user, b); }

  @Patch(':id')
  update(@Req() req: any, @Param('id') id: string, @Body() b: any) { return this.service.update(req.user, id, b); }

  @Delete(':id')
  remove(@Req() req: any, @Param('id') id: string) { return this.service.remove(req.user, id); }
}
