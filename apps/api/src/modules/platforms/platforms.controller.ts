import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiOperation } from '@nestjs/swagger';
import { Platform } from '@social/database';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

import { PlatformsService } from './platforms.service';

@ApiTags('platforms')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('workspaces/:workspaceId/platforms')
export class PlatformsController {
  constructor(private readonly platformsService: PlatformsService) {}

  @Get()
  @ApiOperation({ summary: 'List connected platform accounts' })
  async findAll(@Param('workspaceId') workspaceId: string) {
    return this.platformsService.findAll(workspaceId);
  }

  @Get('oauth/:platform')
  @ApiOperation({ summary: 'Get OAuth URL for platform connection' })
  async getOAuthUrl(
    @Param('workspaceId') workspaceId: string,
    @Param('platform') platform: Platform,
  ) {
    return this.platformsService.getOAuthUrl(workspaceId, platform);
  }

  @Get('oauth/:platform/callback')
  @ApiOperation({ summary: 'Handle OAuth callback' })
  async handleCallback(
    @Param('workspaceId') workspaceId: string,
    @Param('platform') platform: Platform,
    @Query('code') code: string,
  ) {
    return this.platformsService.handleOAuthCallback(workspaceId, platform, code);
  }

  @Delete(':accountId')
  @ApiOperation({ summary: 'Disconnect a platform account' })
  async disconnect(
    @Param('workspaceId') workspaceId: string,
    @Param('accountId') accountId: string,
  ) {
    return this.platformsService.disconnect(workspaceId, accountId);
  }
}
