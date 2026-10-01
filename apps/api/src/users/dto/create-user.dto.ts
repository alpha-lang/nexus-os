import {
  IsEmail, IsString, MinLength, IsOptional, IsEnum,
} from 'class-validator';
import { Role } from '@prisma/client';

export class CreateUserDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  password: string;

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
}
