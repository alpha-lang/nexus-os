import {
  Controller, Get, Post, Patch, Delete, Param, Body, UseGuards,
} from '@nestjs/common';
import { SubscriptionsService } from './subscriptions.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { CreateSubscriptionDto } from './dto/create-subscription.dto';
import { UpdateSubscriptionDto } from './dto/update-subscription.dto';

@Controller('subscriptions')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class SubscriptionsController {
  constructor(private readonly service: SubscriptionsService) {}

  @Get()
  findAll() {
    return this.service.findAll();
  }

  @Get('available-organizations')
  findAvailableOrganizations() {
    return this.service.findOrganizationsWithoutSubscription();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Post()
  create(@Body() dto: CreateSubscriptionDto) {
    return this.service.create(dto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateSubscriptionDto) {
    return this.service.update(id, dto);
  }

  @Patch(':id/activate-module/:moduleId')
  activateModule(@Param('id') id: string, @Param('moduleId') moduleId: string) {
    return this.service.activateModule(id, moduleId);
  }

  @Patch(':id/deactivate-module/:moduleId')
  deactivateModule(@Param('id') id: string, @Param('moduleId') moduleId: string) {
    return this.service.deactivateModule(id, moduleId);
  }

  @Patch(':id/activate')
  activate(@Param('id') id: string) {
    return this.service.activate(id);
  }

  @Patch(':id/suspend')
  suspend(@Param('id') id: string) {
    return this.service.suspend(id);
  }

  @Patch(':id/expire')
  expire(@Param('id') id: string) {
    return this.service.expire(id);
  }
}
