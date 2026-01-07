import { IsString, IsNotEmpty, IsEnum, IsOptional, IsObject } from 'class-validator';
import { WorkspaceTier } from '@social/database';

export class CreateWorkspaceDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  slug: string;

  @IsEnum(WorkspaceTier)
  @IsOptional()
  tier?: WorkspaceTier;

  @IsObject()
  @IsOptional()
  settings?: Record<string, any>;
}
