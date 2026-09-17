import {
  IsOptional, IsIn, IsDateString,
} from 'class-validator';
import { SUB_STATUSES, BILLING_PERIODS, SubStatus, BillingPeriod } from './create-subscription.dto';

export class UpdateSubscriptionDto {
  @IsOptional()
  @IsIn([...SUB_STATUSES])
  status?: SubStatus;

  @IsOptional()
  @IsIn([...BILLING_PERIODS])
  billingPeriod?: BillingPeriod;

  @IsOptional()
  @IsDateString()
  endDate?: string;
}
