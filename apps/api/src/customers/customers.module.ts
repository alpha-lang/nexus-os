import { Module } from '@nestjs/common';
import { CustomersService } from './customers.service';
import { CustomersController } from './customers.controller';
import { PartnersController } from '../partners/partners.controller';
import { PrismaService } from '../prisma.service';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [CustomersController, PartnersController],
  providers: [CustomersService],
  exports: [CustomersService],
})
export class CustomersModule {}
