import {
  Controller, Get, Post, Patch, Delete, Param, Body, Query, UseGuards,
} from '@nestjs/common';
import { HotelService } from './hotel.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('hotel')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class HotelController {
  constructor(private readonly service: HotelService) {}

  // DASHBOARD
  @Get('dashboard')
  dashboard(@CurrentUser() user: any) { return this.service.getDashboard(user); }

  @Get('today')
  today(@CurrentUser() user: any) { return this.service.getArrivalsDepartures(user); }

  // PLANNING
  @Get('planning')
  planning(@CurrentUser() user: any, @Query('from') from: string, @Query('to') to: string) {
    return this.service.getPlanning(user, from, to);
  }

  // ROOM TYPES
  @Get('room-types') roomTypes(@CurrentUser() u: any) { return this.service.findAllRoomTypes(u); }
  @Post('room-types') createRoomType(@CurrentUser() u: any, @Body() b: any) { return this.service.createRoomType(u, b); }
  @Patch('room-types/:id') updateRoomType(@CurrentUser() u: any, @Param('id') id: string, @Body() b: any) { return this.service.updateRoomType(u, id, b); }
  @Delete('room-types/:id') removeRoomType(@CurrentUser() u: any, @Param('id') id: string) { return this.service.removeRoomType(u, id); }

  // ROOMS
  @Get('rooms') rooms(@CurrentUser() u: any) { return this.service.findAllRooms(u); }
  @Post('rooms') createRoom(@CurrentUser() u: any, @Body() b: any) { return this.service.createRoom(u, b); }
  @Patch('rooms/:id') updateRoom(@CurrentUser() u: any, @Param('id') id: string, @Body() b: any) { return this.service.updateRoom(u, id, b); }
  @Delete('rooms/:id') removeRoom(@CurrentUser() u: any, @Param('id') id: string) { return this.service.removeRoom(u, id); }

  // RESERVATIONS
  @Get('reservations')
  reservations(@CurrentUser() u: any, @Query('status') s?: string, @Query('from') f?: string, @Query('to') t?: string) {
    return this.service.findAllReservations(u, { status: s, from: f, to: t });
  }
  @Get('reservations/:id') reservation(@CurrentUser() u: any, @Param('id') id: string) { return this.service.findOneReservation(u, id); }
  @Post('reservations') createReservation(@CurrentUser() u: any, @Body() b: any) { return this.service.createReservation(u, b); }
  @Patch('reservations/:id') updateReservation(@CurrentUser() u: any, @Param('id') id: string, @Body() b: any) { return this.service.updateReservation(u, id, b); }
  @Delete('reservations/:id') removeReservation(@CurrentUser() u: any, @Param('id') id: string) { return this.service.removeReservation(u, id); }

  // CHECK-IN / OUT
  @Patch('reservations/:id/check-in') checkIn(@CurrentUser() u: any, @Param('id') id: string) { return this.service.checkIn(u, id); }
  @Patch('reservations/:id/check-out') checkOut(@CurrentUser() u: any, @Param('id') id: string) { return this.service.checkOut(u, id); }

  // HOUSEKEEPING
  @Get('housekeeping') hkList(@CurrentUser() u: any, @Query('status') s?: string) { return this.service.findAllHousekeeping(u, s); }
  @Post('housekeeping') hkCreate(@CurrentUser() u: any, @Body() b: any) { return this.service.createHousekeeping(u, b); }
  @Patch('housekeeping/:id') hkUpdate(@CurrentUser() u: any, @Param('id') id: string, @Body() b: any) { return this.service.updateHousekeeping(u, id, b); }
  @Delete('housekeeping/:id') hkRemove(@CurrentUser() u: any, @Param('id') id: string) { return this.service.removeHousekeeping(u, id); }

  // FOLIO
  @Get('reservations/:id/folio') folio(@CurrentUser() u: any, @Param('id') id: string) { return this.service.getFolio(u, id); }
  @Post('reservations/:id/folio') addCharge(@CurrentUser() u: any, @Param('id') id: string, @Body() b: any) { return this.service.addFolioCharge(u, id, b); }
  @Delete('folio/:id') removeCharge(@CurrentUser() u: any, @Param('id') id: string) { return this.service.removeFolioCharge(u, id); }

  // MENU
  @Get('menu') menu(@CurrentUser() u: any) { return this.service.findAllMenu(u); }
  @Post('menu') menuCreate(@CurrentUser() u: any, @Body() b: any) { return this.service.createMenuItem(u, b); }
  @Patch('menu/:id') menuUpdate(@CurrentUser() u: any, @Param('id') id: string, @Body() b: any) { return this.service.updateMenuItem(u, id, b); }
  @Delete('menu/:id') menuRemove(@CurrentUser() u: any, @Param('id') id: string) { return this.service.removeMenuItem(u, id); }

  // ORDERS
  @Get('orders') orders(@CurrentUser() u: any, @Query('status') s?: string) { return this.service.findAllOrders(u, s); }
  @Post('orders') orderCreate(@CurrentUser() u: any, @Body() b: any) { return this.service.createOrder(u, b); }
  @Patch('orders/:id/status') orderStatus(@CurrentUser() u: any, @Param('id') id: string, @Body() b: { status: string }) { return this.service.updateOrderStatus(u, id, b.status); }
  @Delete('orders/:id') orderRemove(@CurrentUser() u: any, @Param('id') id: string) { return this.service.removeOrder(u, id); }

  // MAINTENANCE
  @Get('maintenance') maintList(@CurrentUser() u: any) { return this.service.findAllMaintenance(u); }
  @Post('maintenance') maintCreate(@CurrentUser() u: any, @Body() b: any) { return this.service.createMaintenance(u, b); }
  @Patch('maintenance/:id') maintUpdate(@CurrentUser() u: any, @Param('id') id: string, @Body() b: any) { return this.service.updateMaintenance(u, id, b); }
  @Delete('maintenance/:id') maintRemove(@CurrentUser() u: any, @Param('id') id: string) { return this.service.removeMaintenance(u, id); }
}
