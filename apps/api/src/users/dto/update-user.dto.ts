import {
  IsEmail, IsString, MinLength, IsOptional, IsEnum, IsBoolean,
} from 'class-validator';
import { Role } from '@prisma/client';

export class UpdateUserDto {
  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  @MinLength(8)
  password?: string;

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsEnum(Role)
  role?: Role;

  @IsOptional()
  @IsString()
  organizationId?: string;

  @IsOptional()
  @IsString()
  branchId?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
