import {
  IsString, IsOptional, IsArray, IsIn, IsNumber, IsObject,
  Min, MaxLength, MinLength, Matches,
} from 'class-validator';
import { ORG_TYPES } from '../../organizations/dto/create-organization.dto';
import { MODULE_STATUSES, ModuleStatus } from './create-module.dto';

export class UpdateModuleDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  name?: string;

  @IsOptional()
  @IsArray()
  @IsIn([...ORG_TYPES], { each: true })
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
  @Matches(/^\/[a-z0-9\-/]*$/)
  route?: string;
}
