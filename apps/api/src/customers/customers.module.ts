import { Module } from '@nestjs/common';
import { CustomersService } from './customers.service';
import { PartnersController } from '../partners/partners.controller';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { AuthModule } from '../auth/auth.module';
import { WebhooksModule } from '../webhooks/webhooks.module';

@Module({
  imports: [AuthModule, WebhooksModule],
  controllers: [PartnersController],
  providers: [CustomersService],
  exports: [CustomersService],
})
export class CustomersModule {}
