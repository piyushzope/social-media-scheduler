import { IsString, IsArray, IsBoolean, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateRoleDto {
  @ApiProperty({ example: 'Content Manager' })
  @IsString()
  name: string;

  @ApiProperty({
    example: ['posts.create', 'posts.edit', 'posts.view'],
    description: 'Array of permission strings'
  })
  @IsArray()
  @IsString({ each: true })
  permissions: string[];

  @ApiProperty({ example: false, required: false })
  @IsBoolean()
  @IsOptional()
  isDefault?: boolean;
}
