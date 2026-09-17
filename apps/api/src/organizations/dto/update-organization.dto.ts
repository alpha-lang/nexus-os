import {
  IsEmail, IsString, IsOptional, IsIn, MinLength, MaxLength, Matches,
} from 'class-validator';
import { ORG_TYPES, ORG_STATUSES, OrgType, OrgStatus } from './create-organization.dto';

export class UpdateOrganizationDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name?: string;

  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
    message: 'slug doit contenir uniquement minuscules, chiffres et tirets',
  })
  slug?: string;

  @IsOptional()
  @IsIn([...ORG_TYPES])
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
