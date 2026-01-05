import { Controller, Get, Post, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

import { EngagementService } from './engagement.service';

@ApiTags('engagement')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('workspaces/:workspaceId/engagement')
export class EngagementController {
  constructor(private readonly engagementService: EngagementService) {}

  @Get('inbox')
  @ApiOperation({ summary: 'Get unified engagement inbox' })
  @ApiQuery({ name: 'accountId', required: false })
  @ApiQuery({ name: 'type', enum: ['comment', 'message', 'mention'], required: false })
  @ApiQuery({ name: 'page', required: false })
  async getInbox(
    @Param('workspaceId') workspaceId: string,
    @Query('accountId') accountId?: string,
    @Query('type') type?: string,
    @Query('page') page?: string,
  ) {
    return this.engagementService.getInbox(workspaceId, {
      accountId,
      type,
      page: page ? parseInt(page, 10) : 1,
    });
  }

  @Post('reply')
  @ApiOperation({ summary: 'Reply to a comment or message' })
  async reply(
    @Param('workspaceId') workspaceId: string,
    @Body() body: { engagementId: string; content: string },
  ) {
    return this.engagementService.reply(workspaceId, body.engagementId, body.content);
  }

  @Post('suggest-reply')
  @ApiOperation({ summary: 'Get AI-suggested reply' })
  async suggestReply(
    @Param('workspaceId') workspaceId: string,
    @Body() body: { engagementId: string; context?: string },
  ) {
    return this.engagementService.suggestReply(workspaceId, body.engagementId, body.context);
  }
}
