import { Module } from '@nestjs/common';
import { BillingService } from './billing.service';
import { BillingController } from './billing.controller';
import { BillingConfigService } from './billing-config.service';
import { BillingConfigController } from './billing-config.controller';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [BillingController, BillingConfigController],
  providers: [BillingService, BillingConfigService],
  exports: [BillingService, BillingConfigService], // ← Export nécessaire
})
export class BillingModule {}
