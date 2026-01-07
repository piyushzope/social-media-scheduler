import { IsString, IsOptional, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export enum ApprovalAction {
  APPROVE = 'APPROVE',
  REJECT = 'REJECT',
}

export class ApprovalActionDto {
  @ApiProperty({ enum: ApprovalAction, example: ApprovalAction.APPROVE })
  @IsEnum(ApprovalAction)
  action: ApprovalAction;

  @ApiProperty({ example: 'Looks good!', required: false })
  @IsString()
  @IsOptional()
  comment?: string;
}
