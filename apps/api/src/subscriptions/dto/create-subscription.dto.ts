import {
  IsString, IsOptional, IsArray, IsIn, IsNumber, Min,
  ValidateIf, IsDateString,
} from 'class-validator';

export const SUB_STATUSES = ['TRIAL', 'ACTIVE', 'SUSPENDED', 'EXPIRED'] as const;
export const BILLING_PERIODS = ['MONTHLY', 'QUARTERLY', 'ANNUAL'] as const;

export class CreateSubscriptionDto {
  @IsString()
  organizationId: string;

  @IsOptional()
  @IsIn([...SUB_STATUSES])
  status?: string;

  @IsOptional()
  @IsIn([...BILLING_PERIODS])
  billingPeriod?: string;

  @IsOptional()
  @ValidateIf((_, v) => v !== null && v !== undefined && v !== '')
  @IsDateString()
  endDate?: string | null;

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
