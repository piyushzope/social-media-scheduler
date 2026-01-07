import {
  Controller,
  Get,
  Delete,
  Param,
  Query,
  UseGuards,
  Request,
  Redirect,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiOperation } from '@nestjs/swagger';
import { Platform } from '@social/database';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard, RequirePermissions, Permission } from '@/common/permissions';

import { PlatformsService } from './platforms.service';

@ApiTags('platforms')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('workspaces/:workspaceId/platforms')
export class PlatformsController {
  constructor(private readonly platformsService: PlatformsService) {}

  @Get()
  @RequirePermissions(Permission.PLATFORMS_VIEW)
  @ApiOperation({ summary: 'List connected platform accounts' })
  async findAll(
    @Request() req: any,
    @Param('workspaceId') workspaceId: string,
  ) {
    return this.platformsService.findAll(workspaceId, req.user.id);
  }

  @Get('oauth/:platform')
  @RequirePermissions(Permission.PLATFORMS_CONNECT)
  @ApiOperation({ summary: 'Get OAuth URL for platform connection' })
  async getOAuthUrl(
    @Request() req: any,
    @Param('workspaceId') workspaceId: string,
    @Param('platform') platform: Platform,
  ) {
    return this.platformsService.getOAuthUrl(workspaceId, req.user.id, platform);
  }

  @Get('oauth/:platform/callback')
  @RequirePermissions(Permission.PLATFORMS_CONNECT)
  @ApiOperation({ summary: 'Handle OAuth callback' })
  @Redirect()
  async handleCallback(
    @Request() req: any,
    @Param('workspaceId') workspaceId: string,
    @Param('platform') platform: Platform,
    @Query('code') code: string,
    @Query('state') state: string,
  ) {
    const result = await this.platformsService.handleOAuthCallback(
      workspaceId,
      req.user.id,
      platform,
      code,
      state,
    );

    // Redirect to frontend success page
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    return {
      url: `${frontendUrl}/dashboard/workspaces/${workspaceId}/platforms?connected=${result.account.id}`,
    };
  }

  @Delete(':accountId')
  @RequirePermissions(Permission.PLATFORMS_DISCONNECT)
  @ApiOperation({ summary: 'Disconnect a platform account' })
  async disconnect(
    @Request() req: any,
    @Param('workspaceId') workspaceId: string,
    @Param('accountId') accountId: string,
  ) {
    return this.platformsService.disconnect(workspaceId, req.user.id, accountId);
  }
}
