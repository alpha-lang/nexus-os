import { IsArray, IsString, IsOptional, MaxLength, ArrayMaxSize } from 'class-validator';

export class UpdateOrgTagsDto {
  @IsArray()
  @IsString({ each: true })
  @ArrayMaxSize(20)
  tags: string[];

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  notes?: string;
}
