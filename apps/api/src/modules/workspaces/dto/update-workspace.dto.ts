import { IsString, IsEnum, IsOptional, IsObject } from 'class-validator';
import { WorkspaceTier } from '@social/database';

export class UpdateWorkspaceDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsEnum(WorkspaceTier)
  @IsOptional()
  tier?: WorkspaceTier;

  @IsObject()
  @IsOptional()
  settings?: Record<string, any>;
}
