import { Controller, Get, Post, Patch, Delete, Param, Body, Query, UseGuards } from '@nestjs/common';
import { PosService } from './pos.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('pos')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class PosController {
  constructor(private readonly service: PosService) {}

  @Get('stats') stats(@CurrentUser() u: any) { return this.service.getStats(u); }

  // MENU
  @Get('menu') menu(@CurrentUser() u: any, @Query('category') c?: string) { return this.service.findAllMenu(u, c); }
  @Post('menu') menuCreate(@CurrentUser() u: any, @Body() b: any) { return this.service.createMenuItem(u, b); }
  @Patch('menu/:id') menuUpdate(@CurrentUser() u: any, @Param('id') id: string, @Body() b: any) { return this.service.updateMenuItem(u, id, b); }
  @Delete('menu/:id') menuRemove(@CurrentUser() u: any, @Param('id') id: string) { return this.service.removeMenuItem(u, id); }

  // TABLES
  @Get('tables') tables(@CurrentUser() u: any) { return this.service.findAllTables(u); }
  @Post('tables') tableCreate(@CurrentUser() u: any, @Body() b: any) { return this.service.createTable(u, b); }
  @Patch('tables/:id') tableUpdate(@CurrentUser() u: any, @Param('id') id: string, @Body() b: any) { return this.service.updateTable(u, id, b); }
  @Delete('tables/:id') tableRemove(@CurrentUser() u: any, @Param('id') id: string) { return this.service.removeTable(u, id); }

  // ORDERS
  @Get('orders')
  orders(
    @CurrentUser() u: any,
    @Query('status') status?: string,
    @Query('cursor') cursor?: string,
    @Query('take') take?: string,
  ) {
    return this.service.findAllOrders(u, { status, cursor, take });
  }
  @Get('orders/active') activeOrders(@CurrentUser() u: any) { return this.service.findActiveOrders(u); }
  @Get('orders/:id') order(@CurrentUser() u: any, @Param('id') id: string) { return this.service.findOneOrder(u, id); }
  @Post('orders') createOrder(@CurrentUser() u: any, @Body() b: any) { return this.service.createOrder(u, b); }
  @Post('orders/:id/items') addItems(@CurrentUser() u: any, @Param('id') id: string, @Body() b: any) { return this.service.addItemsToOrder(u, id, b.items || []); }
  @Patch('orders/items/:itemId') updateItem(@CurrentUser() u: any, @Param('itemId') itemId: string, @Body() b: any) { return this.service.updateOrderItem(u, itemId, b.quantity); }
  @Delete('orders/items/:itemId') removeItem(@CurrentUser() u: any, @Param('itemId') itemId: string) { return this.service.removeOrderItem(u, itemId); }

  @Patch('orders/:id/kitchen') sendKitchen(@CurrentUser() u: any, @Param('id') id: string) { return this.service.sendToKitchen(u, id); }
  @Patch('orders/:id/served') markServed(@CurrentUser() u: any, @Param('id') id: string) { return this.service.markServed(u, id); }
  @Post('orders/:id/pay') pay(@CurrentUser() u: any, @Param('id') id: string, @Body() b: any) { return this.service.payOrder(u, id, b); }
  @Post('orders/:id/defer') defer(@CurrentUser() u: any, @Param('id') id: string, @Body() b: { reservationId: string }) { return this.service.deferToRoom(u, id, b.reservationId); }
  @Patch('orders/:id/cancel') cancel(@CurrentUser() u: any, @Param('id') id: string, @Body() b: any) { return this.service.cancelOrder(u, id, b?.reason); }

  // ═══ FOLIOS ═══
  @Get('folios') folios(@CurrentUser() u: any) { return this.service.findAllFolios(u); }
  @Post('folios/:reservationId/charges') addCharge(@CurrentUser() u: any, @Param('reservationId') rid: string, @Body() b: any) { return this.service.addFolioCharge(u, rid, b); }
  @Delete('folios/charges/:chargeId') removeCharge(@CurrentUser() u: any, @Param('chargeId') cid: string) { return this.service.removeFolioCharge(u, cid); }
  @Post('folios/:reservationId/close') closeFolio(@CurrentUser() u: any, @Param('reservationId') rid: string, @Body() b: any) { return this.service.closeFolio(u, rid, b); }
  @Post('folios/:reservationId/checkout') checkout(@CurrentUser() u: any, @Param('reservationId') rid: string, @Body() b: any) { return this.service.checkoutFolio(u, rid, b); }

  // ═══ CRÉDITS ═══
  @Get('credits') credits(@CurrentUser() u: any) { return this.service.findAllCredits(u); }
  @Get('credits/stats') creditsStats(@CurrentUser() u: any) { return this.service.getCreditsStats(u); }
  @Post('credits/:id/pay') payCredit(@CurrentUser() u: any, @Param('id') id: string, @Body() b: any) { return this.service.payCredit(u, id, b); }

  // Marquer une commande en crédit
  @Post('orders/:id/credit') markCredit(@CurrentUser() u: any, @Param('id') id: string, @Body() b: any) { return this.service.markAsCredit(u, id, b); }
}
