import { Module } from '@nestjs/common';
import { SupportService } from './support.service';
import { MacrosService } from './macros.service';
import { SupportController } from './support.controller';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [SupportController],
  providers: [SupportService, MacrosService],
  exports: [SupportService, MacrosService],
})
export class SupportModule {}
