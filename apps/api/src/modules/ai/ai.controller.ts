import { Controller, Post, Body, UseGuards, Param } from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiOperation } from '@nestjs/swagger';
import { Platform } from '@social/database';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

import { AiService } from './ai.service';

class GenerateContentDto {
  topic: string;
  platform: Platform;
  tone?: string;
  includeHashtags?: boolean;
}

class EnhanceContentDto {
  content: string;
  platform: Platform;
}

@ApiTags('ai')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('workspaces/:workspaceId/ai')
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Post('generate')
  @ApiOperation({ summary: 'Generate content for a topic' })
  async generateContent(
    @Param('workspaceId') workspaceId: string,
    @Body() dto: GenerateContentDto,
  ) {
    return this.aiService.generateContent(workspaceId, dto);
  }

  @Post('enhance')
  @ApiOperation({ summary: 'Enhance existing content' })
  async enhanceContent(
    @Param('workspaceId') workspaceId: string,
    @Body() dto: EnhanceContentDto,
  ) {
    return this.aiService.enhanceContent(workspaceId, dto);
  }

  @Post('suggest-hashtags')
  @ApiOperation({ summary: 'Suggest hashtags for content' })
  async suggestHashtags(
    @Param('workspaceId') workspaceId: string,
    @Body() body: { content: string; platform: Platform },
  ) {
    return this.aiService.suggestHashtags(body.content, body.platform);
  }

  @Post('suggest-timing')
  @ApiOperation({ summary: 'Suggest optimal posting time' })
  async suggestTiming(
    @Param('workspaceId') workspaceId: string,
    @Body() body: { accountId: string },
  ) {
    return this.aiService.suggestTiming(workspaceId, body.accountId);
  }
}
