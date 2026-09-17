import {
  IsString, IsOptional, IsArray, IsIn, IsNumber, IsObject,
  Min, MaxLength, MinLength, Matches,
} from 'class-validator';
import { ORG_TYPES } from '../../organizations/dto/create-organization.dto';

export const MODULE_STATUSES = ['ACTIVE', 'INACTIVE'] as const;
export type ModuleStatus = (typeof MODULE_STATUSES)[number];

export class CreateModuleDto {
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  name: string;

  @IsOptional()
  @IsArray()
  @IsIn([...ORG_TYPES], {
    each: true,
    message: `types doit contenir uniquement : ${ORG_TYPES.join(', ')}`,
  })
  types?: string[];

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  price?: number;

  @IsOptional()
  @IsObject()
  pricing?: Record<string, number>;

  @IsOptional()
  @IsIn([...MODULE_STATUSES])
  status?: ModuleStatus;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  @Matches(/^\/[a-z0-9\-/]*$/, {
    message: 'route doit commencer par / et contenir uniquement minuscules, chiffres et tirets',
  })
  route?: string;
}
