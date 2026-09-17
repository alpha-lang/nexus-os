import { Module } from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { OrganizationsModule } from './organizations/organizations.module';
import { UsersModule } from './users/users.module';
import { CustomersModule } from './customers/customers.module';
import { ModulesModule } from './modules/modules.module';
import { SalesModule } from './sales/sales.module';
import { SubscriptionsModule } from './subscriptions/subscriptions.module';
import { BillingModule } from './billing/billing.module';
import { StorageModule } from './storage/storage.module';
import { HotelModule } from './hotel/hotel.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { SearchModule } from './search/search.module';
import { PosModule } from './pos/pos.module';
import { CashModule } from './cash/cash.module';
import { StockModule } from './stock/stock.module';

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    OrganizationsModule,
    UsersModule,
    CustomersModule,
    ModulesModule,
    SalesModule,
    SubscriptionsModule,
    BillingModule,
    StorageModule,
    HotelModule,
    DashboardModule,
    SearchModule,
    PosModule,
    CashModule,
    StockModule,
  ],
})
export class AppModule {}
