import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

import { AnalyticsService } from './analytics.service';

@ApiTags('analytics')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('workspaces/:workspaceId/analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('summary')
  @ApiOperation({ summary: 'Get analytics summary across all platforms' })
  @ApiQuery({ name: 'period', enum: ['day', 'week', 'month'], required: false })
  async getSummary(
    @Param('workspaceId') workspaceId: string,
    @Query('period') period: 'day' | 'week' | 'month' = 'week',
  ) {
    return this.analyticsService.getSummary(workspaceId, period);
  }

  @Get('accounts/:accountId')
  @ApiOperation({ summary: 'Get analytics for a specific account' })
  async getAccountAnalytics(
    @Param('workspaceId') workspaceId: string,
    @Param('accountId') accountId: string,
  ) {
    return this.analyticsService.getAccountAnalytics(workspaceId, accountId);
  }

  @Get('posts/:postId')
  @ApiOperation({ summary: 'Get analytics for a specific post' })
  async getPostAnalytics(
    @Param('workspaceId') workspaceId: string,
    @Param('postId') postId: string,
  ) {
    return this.analyticsService.getPostAnalytics(workspaceId, postId);
  }
}
