import { Controller, Get, Post, Patch, Delete, Param, Body, Query, UseGuards } from '@nestjs/common';
import { StockService } from './stock.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('stock')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class StockController {
  constructor(private readonly service: StockService) {}

  // DASHBOARD
  @Get('dashboard')
  dashboard(@CurrentUser() u: any) { return this.service.getDashboard(u); }

  // WAREHOUSES
  @Get('warehouses') warehouses(@CurrentUser() u: any) { return this.service.findAllWarehouses(u); }
  @Post('warehouses') createWarehouse(@CurrentUser() u: any, @Body() b: any) { return this.service.createWarehouse(u, b); }
  @Patch('warehouses/:id') updateWarehouse(@CurrentUser() u: any, @Param('id') id: string, @Body() b: any) { return this.service.updateWarehouse(u, id, b); }
  @Delete('warehouses/:id') removeWarehouse(@CurrentUser() u: any, @Param('id') id: string) { return this.service.removeWarehouse(u, id); }

  // SUPPLIERS
  @Get('suppliers') suppliers(@CurrentUser() u: any) { return this.service.findAllSuppliers(u); }
  @Post('suppliers') createSupplier(@CurrentUser() u: any, @Body() b: any) { return this.service.createSupplier(u, b); }
  @Patch('suppliers/:id') updateSupplier(@CurrentUser() u: any, @Param('id') id: string, @Body() b: any) { return this.service.updateSupplier(u, id, b); }
  @Delete('suppliers/:id') removeSupplier(@CurrentUser() u: any, @Param('id') id: string) { return this.service.removeSupplier(u, id); }

  // ITEMS
  @Get('items') items(@CurrentUser() u: any, @Query() q: any) { return this.service.findAllItems(u, q); }
  @Get('items/:id') item(@CurrentUser() u: any, @Param('id') id: string) { return this.service.findOneItem(u, id); }
  @Post('items') createItem(@CurrentUser() u: any, @Body() b: any) { return this.service.createItem(u, b); }
  @Patch('items/:id') updateItem(@CurrentUser() u: any, @Param('id') id: string, @Body() b: any) { return this.service.updateItem(u, id, b); }
  @Delete('items/:id') removeItem(@CurrentUser() u: any, @Param('id') id: string) { return this.service.removeItem(u, id); }

  // MOVEMENTS
  @Get('movements') movements(@CurrentUser() u: any, @Query() q: any) { return this.service.findAllMovements(u, q); }
  @Post('movements') createMovement(@CurrentUser() u: any, @Body() b: any) { return this.service.createMovement(u, b); }
  @Delete('movements/:id') removeMovement(@CurrentUser() u: any, @Param('id') id: string) { return this.service.removeMovement(u, id); }

  // TRANSFERS
  @Post('transfers') transfer(@CurrentUser() u: any, @Body() b: any) { return this.service.transferBetweenWarehouses(u, b); }

  // RECIPES
  @Get('recipes') recipes(@CurrentUser() u: any) { return this.service.findAllRecipes(u); }
  @Get('recipes/:id') recipe(@CurrentUser() u: any, @Param('id') id: string) { return this.service.findOneRecipe(u, id); }
  @Post('recipes') createRecipe(@CurrentUser() u: any, @Body() b: any) { return this.service.createRecipe(u, b); }
  @Patch('recipes/:id') updateRecipe(@CurrentUser() u: any, @Param('id') id: string, @Body() b: any) { return this.service.updateRecipe(u, id, b); }
  @Delete('recipes/:id') removeRecipe(@CurrentUser() u: any, @Param('id') id: string) { return this.service.removeRecipe(u, id); }

  // REPORTS
  @Get('reports/rotation') rotation(@CurrentUser() u: any, @Query('days') d: string) {
    return this.service.getRotationReport(u, d ? parseInt(d) : 30);
  }
  @Get('reports/abc') abc(@CurrentUser() u: any, @Query('days') d: string) {
    return this.service.getAbcReport(u, d ? parseInt(d) : 30);
  }
  @Get('reports/price-history') priceHistory(@CurrentUser() u: any, @Query('itemId') iid: string) {
    return this.service.getPriceHistoryReport(u, iid || undefined);
  }

  // INVENTORY
  @Post('inventory/submit') submitInventory(@CurrentUser() u: any, @Body() b: any) { return this.service.submitInventory(u, b); }
}
