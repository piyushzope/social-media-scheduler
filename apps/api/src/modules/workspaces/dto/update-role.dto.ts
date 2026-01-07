import { IsString, IsArray, IsBoolean, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateRoleDto {
  @ApiProperty({ example: 'Content Manager', required: false })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiProperty({
    example: ['posts.create', 'posts.edit', 'posts.view'],
    description: 'Array of permission strings',
    required: false
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  permissions?: string[];

  @ApiProperty({ example: false, required: false })
  @IsBoolean()
  @IsOptional()
  isDefault?: boolean;
}
