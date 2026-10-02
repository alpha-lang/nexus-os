import { Controller, Get, Post, Patch, Delete, Param, Body, Query, UseGuards, Req } from '@nestjs/common';
import { WebhooksService, WEBHOOK_EVENTS } from './webhooks.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';

@Controller('webhooks')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class WebhooksController {
  constructor(private readonly service: WebhooksService) {}

  @Get('events')
  events() { return WEBHOOK_EVENTS; }

  @Get()
  findAll(@Req() req: any) { return this.service.findAll(req.user); }

  @Post()
  create(@Req() req: any, @Body() b: any) { return this.service.create(req.user, b); }

  @Patch(':id')
  update(@Req() req: any, @Param('id') id: string, @Body() b: any) { return this.service.update(req.user, id, b); }

  @Delete(':id')
  remove(@Req() req: any, @Param('id') id: string) { return this.service.remove(req.user, id); }

  @Post(':id/test')
  test(@Req() req: any, @Param('id') id: string) { return this.service.test(req.user, id); }

  @Get(':id/deliveries')
  deliveries(@Req() req: any, @Param('id') id: string, @Query('take') take?: string) {
    return this.service.getDeliveries(req.user, id, take ? parseInt(take) : 50);
  }

  @Post('deliveries/:deliveryId/retry')
  retry(@Req() req: any, @Param('deliveryId') deliveryId: string) {
    return this.service.retryDelivery(req.user, deliveryId);
  }
}
