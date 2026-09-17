import {
  IsOptional, IsIn, ValidateIf, IsDateString,
} from 'class-validator';

export class UpdateSubscriptionDto {
  @IsOptional()
  @IsIn(['TRIAL', 'ACTIVE', 'SUSPENDED', 'EXPIRED'])
  status?: string;

  @IsOptional()
  @IsIn(['MONTHLY', 'QUARTERLY', 'ANNUAL'])
  billingPeriod?: string;

  @IsOptional()
  @ValidateIf((_, v) => v !== null && v !== undefined && v !== '')
  @IsDateString()
  endDate?: string | null;
}
