import { Controller, Get, Post, Patch, Delete, Param, Body, Query, UseGuards } from '@nestjs/common';
import { PurchaseOrdersService } from './purchase-orders.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('stock/orders')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class PurchaseOrdersController {
  constructor(private readonly service: PurchaseOrdersService) {}

  @Get() list(@CurrentUser() u: any, @Query() q: any) { return this.service.findAll(u, q); }
  @Get('suggest/:supplierId') suggest(@CurrentUser() u: any, @Param('supplierId') sid: string) { return this.service.suggestOrder(u, sid); }
  @Get(':id') one(@CurrentUser() u: any, @Param('id') id: string) { return this.service.findOne(u, id); }
  @Post() create(@CurrentUser() u: any, @Body() b: any) { return this.service.create(u, b); }
  @Patch(':id') update(@CurrentUser() u: any, @Param('id') id: string, @Body() b: any) { return this.service.update(u, id, b); }
  @Patch(':id/send') send(@CurrentUser() u: any, @Param('id') id: string) { return this.service.send(u, id); }
  @Patch(':id/cancel') cancel(@CurrentUser() u: any, @Param('id') id: string) { return this.service.cancel(u, id); }
  @Post(':id/receive') receive(@CurrentUser() u: any, @Param('id') id: string, @Body() b: any) { return this.service.receive(u, id, b); }
  @Delete(':id') remove(@CurrentUser() u: any, @Param('id') id: string) { return this.service.remove(u, id); }
}
