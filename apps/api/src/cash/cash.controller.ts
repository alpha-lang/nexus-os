import { Controller, Get, Post, Patch, Delete, Param, Body, Query, UseGuards } from '@nestjs/common';
import { CashService } from './cash.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('cash')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class CashController {
  constructor(private readonly service: CashService) {}

  @Get('stats') stats(@CurrentUser() u: any) { return this.service.getGlobalStats(u); }

  @Get('registers') registers(@CurrentUser() u: any) { return this.service.findAllRegisters(u); }
  @Post('registers') createRegister(@CurrentUser() u: any, @Body() b: any) { return this.service.createRegister(u, b); }
  @Patch('registers/:id') updateRegister(@CurrentUser() u: any, @Param('id') id: string, @Body() b: any) { return this.service.updateRegister(u, id, b); }
  @Delete('registers/:id') removeRegister(@CurrentUser() u: any, @Param('id') id: string) { return this.service.removeRegister(u, id); }

  @Get('movements') movements(@CurrentUser() u: any, @Query() q: any) { return this.service.findAllMovements(u, q); }
  @Post('movements') createMovement(@CurrentUser() u: any, @Body() b: any) { return this.service.createMovement(u, b); }
  @Delete('movements/:id') removeMovement(@CurrentUser() u: any, @Param('id') id: string) { return this.service.removeMovement(u, id); }

  @Get('sessions') sessions(@CurrentUser() u: any, @Query('registerId') rid?: string) { return this.service.findAllSessions(u, rid); }
  @Post('registers/:id/open') openRegister(@CurrentUser() u: any, @Param('id') id: string, @Body() b: any) { return this.service.openRegister(u, id, b); }
  @Post('registers/:id/close') closeRegister(@CurrentUser() u: any, @Param('id') id: string, @Body() b: any) { return this.service.closeRegister(u, id, b); }
}
