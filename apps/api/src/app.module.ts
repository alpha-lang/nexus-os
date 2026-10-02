import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { MaintenanceMiddleware } from './maintenance/maintenance.middleware';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { createThrottlerConfig } from './common/throttler/throttler.config';

import { PrismaModule } from './prisma/prisma.module';
import { LoggerMiddleware } from './common/middleware/logger.middleware';
import { HealthModule } from './health/health.module';
import { AuthModule } from './auth/auth.module';
import { OrganizationsModule } from './organizations/organizations.module';
import { UsersModule } from './users/users.module';
import { CustomersModule } from './customers/customers.module';
import { CrmModule } from './crm/crm.module';
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
import { AuditModule } from './audit/audit.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { MonitoringModule } from './monitoring/monitoring.module';
import { AnnouncementsModule } from './announcements/announcements.module';
import { FeatureFlagsModule } from './feature-flags/feature-flags.module';
import { MaintenanceModule } from './maintenance/maintenance.module';

@Module({
  imports: [
    ThrottlerModule.forRoot(createThrottlerConfig()),
    PrismaModule,
    HealthModule,
    AuthModule,
    OrganizationsModule,
    UsersModule,
    CustomersModule,
    CrmModule,
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
    AuditModule,
    AnalyticsModule,
    MonitoringModule,
    AnnouncementsModule,
    FeatureFlagsModule,
    MaintenanceModule,
    JwtModule.register({ secret: process.env.JWT_SECRET }),
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(MaintenanceMiddleware).forRoutes('*');
    consumer.apply(LoggerMiddleware).forRoutes('*');
  }
}
