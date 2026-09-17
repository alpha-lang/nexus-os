import {
  IsOptional, IsIn, ValidateIf, IsDateString,
} from 'class-validator';
import { SubscriptionStatus } from '@prisma/client';

export class UpdateSubscriptionDto {
  @IsOptional()
  @IsIn(['TRIAL', 'ACTIVE', 'SUSPENDED', 'EXPIRED'])
  status?: SubscriptionStatus;

  @IsOptional()
  @IsIn(['MONTHLY', 'QUARTERLY', 'ANNUAL'])
  billingPeriod?: string;

  @IsOptional()
  @ValidateIf((_, v) => v !== null && v !== undefined && v !== '')
  @IsDateString()
  endDate?: string | null;
}
