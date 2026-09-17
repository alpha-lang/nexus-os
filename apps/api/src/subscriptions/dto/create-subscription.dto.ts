import {
  IsString, IsOptional, IsArray, IsIn, IsNumber, IsDateString, Min,
} from 'class-validator';

export const SUB_STATUSES = ['TRIAL', 'ACTIVE', 'SUSPENDED', 'EXPIRED'] as const;
export const BILLING_PERIODS = ['MONTHLY', 'QUARTERLY', 'ANNUAL'] as const;
export type SubStatus = (typeof SUB_STATUSES)[number];
export type BillingPeriod = (typeof BILLING_PERIODS)[number];

export class CreateSubscriptionDto {
  @IsString()
  organizationId: string;

  @IsOptional()
  @IsIn([...SUB_STATUSES])
  status?: SubStatus;

  @IsOptional()
  @IsIn([...BILLING_PERIODS])
  billingPeriod?: BillingPeriod;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  moduleIds?: string[];

  @IsOptional()
  @IsNumber()
  @Min(0)
  maxStorage?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  quotaPrice?: number;
}
