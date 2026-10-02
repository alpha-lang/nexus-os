import { IsString, MinLength, MaxLength } from 'class-validator';

export class SuspendOrganizationDto {
  @IsString()
  @MinLength(5, { message: 'La raison doit faire au moins 5 caractères' })
  @MaxLength(500)
  reason: string;
}
