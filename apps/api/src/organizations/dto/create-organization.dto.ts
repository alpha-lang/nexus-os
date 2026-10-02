import {
  IsEmail, IsString, IsOptional, IsIn, IsArray,
  MinLength, MaxLength, Matches, ValidateIf,
} from 'class-validator';

export const ORG_TYPES = [
  'COMMERCE',
  'HOTEL',
  'RESTAURANT',
  'ECOLE',
  'CLINIQUE',
  'ONG',
  'MICROFINANCE',
  'BANQUE',
  'INTERNE',
] as const;

export const ORG_STATUSES = ['ACTIVE', 'SUSPENDED', 'INACTIVE'] as const;
export const BILLING_PERIODS = ['MONTHLY', 'QUARTERLY', 'ANNUAL'] as const;
export const SUB_STATUSES = ['TRIAL', 'ACTIVE', 'SUSPENDED'] as const;

export type OrgType = (typeof ORG_TYPES)[number];
export type OrgStatus = (typeof ORG_STATUSES)[number];
export type BillingPeriod = (typeof BILLING_PERIODS)[number];

export class CreateOrganizationDto {
  // ═══ Organisation ═══
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name: string;

  @IsString()
  @MinLength(2)
  @MaxLength(80)
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
    message: 'slug doit contenir uniquement minuscules, chiffres et tirets',
  })
  slug: string;

  @IsOptional()
  @IsIn([...ORG_TYPES], { message: `type doit être : ${ORG_TYPES.join(', ')}` })
  type?: OrgType;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  city?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  phone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @IsOptional()
  @IsIn([...ORG_STATUSES])
  status?: OrgStatus;

  // ═══ Admin de l'organisation (optionnel en mode "rapide") ═══
  @IsOptional()
  @ValidateIf((_, v) => v !== null && v !== undefined && v !== '')
  @IsEmail()
  adminEmail?: string;

  @IsOptional()
  @ValidateIf((_, v) => v !== null && v !== undefined && v !== '')
  @IsString()
  @MinLength(8)
  adminPassword?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  adminName?: string;

  // ═══ Abonnement ═══
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  moduleIds?: string[];

  @IsOptional()
  @IsIn([...SUB_STATUSES])
  subscriptionStatus?: 'TRIAL' | 'ACTIVE' | 'SUSPENDED';

  @IsOptional()
  @IsIn([...BILLING_PERIODS])
  billingPeriod?: BillingPeriod;

  @IsOptional()
  endDate?: string;
}
