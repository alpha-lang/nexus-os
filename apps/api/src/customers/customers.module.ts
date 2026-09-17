import { Module } from '@nestjs/common';
import { CustomersService } from './customers.service';
import { PartnersController } from '../partners/partners.controller';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [PartnersController],
  providers: [CustomersService],
  exports: [CustomersService],
})
export class CustomersModule {}
