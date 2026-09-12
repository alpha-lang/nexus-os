import { Module } from '@nestjs/common';
import { BillingService } from './billing.service';
import { BillingController } from './billing.controller';
import { PrismaService } from '../prisma.service';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [BillingController],
  providers: [BillingService, PrismaService],
  exports: [BillingService], // ← Export nécessaire
})
export class BillingModule {}
