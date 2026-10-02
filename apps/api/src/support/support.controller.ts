import { Controller, Get, Post, Patch, Delete, Param, Body, Query, UseGuards, Req } from '@nestjs/common';
import { SupportService } from './support.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';

@Controller('support')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class SupportController {
  constructor(private readonly service: SupportService) {}

  @Get('stats')
  stats(@Req() req: any) { return this.service.getStats(req.user); }

  @Get()
  findAll(@Req() req: any, @Query() q: any) { return this.service.findAll(req.user, q); }

  @Get(':id')
  findOne(@Req() req: any, @Param('id') id: string) { return this.service.findOne(req.user, id); }

  @Post()
  create(@Req() req: any, @Body() b: any) { return this.service.create(req.user, b); }

  @Patch(':id')
  update(@Req() req: any, @Param('id') id: string, @Body() b: any) { return this.service.update(req.user, id, b); }

  @Post(':id/messages')
  addMessage(@Req() req: any, @Param('id') id: string, @Body() b: any) { return this.service.addMessage(req.user, id, b); }

  @Delete(':id')
  remove(@Req() req: any, @Param('id') id: string) { return this.service.remove(req.user, id); }
}
