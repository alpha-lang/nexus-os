import { Module } from '@nestjs/common';
import { StockService } from './stock.service';
import { StockController } from './stock.controller';
import { PurchaseOrdersService } from './purchase-orders.service';
import { PurchaseOrdersController } from './purchase-orders.controller';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [StockController, PurchaseOrdersController],
  providers: [StockService, PurchaseOrdersService],
  exports: [StockService, PurchaseOrdersService],
})
export class StockModule {}
