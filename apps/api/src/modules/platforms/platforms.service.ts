import { Injectable, NotFoundException, NotImplementedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Platform } from '@social/database';

import { DatabaseService } from '@/common/database/database.service';

@Injectable()
export class PlatformsService {
  constructor(
    private readonly db: DatabaseService,
    private readonly configService: ConfigService,
  ) {}

  async findAll(workspaceId: string) {
    return this.db.platformAccount.findMany({
      where: { workspaceId, isActive: true },
      select: {
        id: true,
        platform: true,
        platformUsername: true,
        timezone: true,
        isActive: true,
        createdAt: true,
      },
    });
  }

  async getOAuthUrl(workspaceId: string, platform: Platform): Promise<{ url: string }> {
    // TODO: Implement OAuth URL generation for each platform
    const oauthConfig = this.configService.get(`oauth.${platform.toLowerCase()}`);

    if (!oauthConfig?.clientId) {
      throw new NotImplementedException(`OAuth not configured for ${platform}`);
    }

    // Platform-specific OAuth URLs would be generated here
    throw new NotImplementedException(`OAuth for ${platform} not yet implemented`);
  }

  async handleOAuthCallback(
    workspaceId: string,
    platform: Platform,
    code: string,
  ) {
    // TODO: Implement OAuth token exchange for each platform
    throw new NotImplementedException(`OAuth callback for ${platform} not yet implemented`);
  }

  async disconnect(workspaceId: string, accountId: string) {
    const account = await this.db.platformAccount.findFirst({
      where: { id: accountId, workspaceId },
    });

    if (!account) {
      throw new NotFoundException('Platform account not found');
    }

    await this.db.platformAccount.update({
      where: { id: accountId },
      data: { isActive: false },
    });

    return { success: true };
  }

  async refreshTokenIfNeeded(accountId: string): Promise<void> {
    const account = await this.db.platformAccount.findUnique({
      where: { id: accountId },
    });

    if (!account) {
      throw new NotFoundException('Platform account not found');
    }

    if (account.tokenExpiresAt && account.tokenExpiresAt < new Date()) {
      // TODO: Implement token refresh for each platform
      throw new NotImplementedException('Token refresh not yet implemented');
    }
  }
}
