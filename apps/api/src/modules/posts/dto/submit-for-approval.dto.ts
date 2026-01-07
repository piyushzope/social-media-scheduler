import { IsArray, IsString, IsNumber, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

class ApprovalStepDto {
  @ApiProperty({ example: 'user-id-123' })
  @IsString()
  approverId: string;

  @ApiProperty({ example: 1 })
  @IsNumber()
  order: number;
}

export class SubmitForApprovalDto {
  @ApiProperty({
    type: [ApprovalStepDto],
    example: [
      { approverId: 'user-id-123', order: 1 },
      { approverId: 'user-id-456', order: 2 },
    ],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ApprovalStepDto)
  approvalSteps: ApprovalStepDto[];
}
