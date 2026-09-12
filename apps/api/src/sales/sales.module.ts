import { Module } from '@nestjs/common';
import { SalesService } from './sales.service';
import { SalesController } from './sales.controller';
import { PrismaService } from '../prisma.service';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [SalesController],
  providers: [SalesService, PrismaService],
  exports: [SalesService],
})
export class SalesModule {}
