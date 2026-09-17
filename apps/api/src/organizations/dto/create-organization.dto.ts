import {
  IsEmail, IsString, IsOptional, IsIn, MinLength, MaxLength, Matches,
} from 'class-validator';

export const ORG_TYPES = ['COMMERCE', 'HOTEL', 'ONG', 'MICROFINANCE', 'BANQUE', 'INTERNE'] as const;
export const ORG_STATUSES = ['ACTIVE', 'SUSPENDED', 'INACTIVE'] as const;
export type OrgType = (typeof ORG_TYPES)[number];
export type OrgStatus = (typeof ORG_STATUSES)[number];

export class CreateOrganizationDto {
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
}
