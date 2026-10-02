import { IsEmail, IsString, MinLength, IsOptional, MaxLength } from 'class-validator';

export class LoginDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(6)
  password: string;

  // Multi-tenant : si l'email existe dans plusieurs orgs, requis pour lever l'ambiguïté
  @IsOptional()
  @IsString()
  @MaxLength(80)
  organizationSlug?: string;
}
