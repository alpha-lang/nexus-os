import { Controller, Get, Post, Patch, Delete, Param, Body, Query, UseGuards, Req } from '@nestjs/common';
import { SupportService } from './support.service';
import { MacrosService } from './macros.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';

@Controller('support')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class SupportController {
  constructor(
    private readonly service: SupportService,
    private readonly macros: MacrosService,
  ) {}

  @Get('stats')
  stats(@Req() req: any) { return this.service.getStats(req.user); }

  @Get('sla-stats')
  slaStats(@Req() req: any) { return this.service.getSlaStats(req.user); }

  // ═══ MACROS ═══
  @Get('macros')
  listMacros(@Req() req: any) { return this.macros.findAll(req.user); }

  @Post('macros')
  createMacro(@Req() req: any, @Body() b: any) { return this.macros.create(req.user, b); }

  @Patch('macros/:id')
  updateMacro(@Req() req: any, @Param('id') id: string, @Body() b: any) { return this.macros.update(req.user, id, b); }

  @Delete('macros/:id')
  deleteMacro(@Req() req: any, @Param('id') id: string) { return this.macros.remove(req.user, id); }

  @Post('macros/:id/use')
  useMacro(@Req() req: any, @Param('id') id: string) { return this.macros.use(req.user, id); }

  @Get()
  findAll(@Req() req: any, @Query() q: any) { return this.service.findAll(req.user, q); }

  @Get(':id')
  findOne(@Req() req: any, @Param('id') id: string) { return this.service.findOne(req.user, id); }

  @Post()
  create(@Req() req: any, @Body() b: any) { return this.service.create(req.user, b); }

  @Patch(':id')
  update(@Req() req: any, @Param('id') id: string, @Body() b: any) { return this.service.update(req.user, id, b); }

  @Post(':id/reassign')
  reassign(@Req() req: any, @Param('id') id: string, @Body() b: { userId: string | null }) {
    return this.service.reassign(req.user, id, b.userId);
  }

  @Post(':id/messages')
  addMessage(@Req() req: any, @Param('id') id: string, @Body() b: any) { return this.service.addMessage(req.user, id, b); }

  @Delete(':id')
  remove(@Req() req: any, @Param('id') id: string) { return this.service.remove(req.user, id); }
}
