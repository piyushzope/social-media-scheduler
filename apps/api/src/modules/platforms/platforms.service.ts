import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Platform } from '@social/database';
import axios from 'axios';

import { DatabaseService } from '@/common/database/database.service';
import { EncryptionService } from '@/common/encryption/encryption.service';

@Injectable()
export class PlatformsService {
  constructor(
    private readonly db: DatabaseService,
    private readonly configService: ConfigService,
    private readonly encryptionService: EncryptionService,
  ) {}

  async findAll(workspaceId: string, userId: string) {
    // Verify user has access to this workspace
    await this.verifyWorkspaceAccess(workspaceId, userId);

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

  async getOAuthUrl(workspaceId: string, userId: string, platform: Platform): Promise<{ url: string }> {
    // Verify user has access to this workspace
    await this.verifyWorkspaceAccess(workspaceId, userId);

    const oauthConfig = this.configService.get(`oauth.${platform.toLowerCase()}`);

    if (!oauthConfig?.clientId || !oauthConfig?.redirectUri) {
      throw new BadRequestException(`OAuth not configured for ${platform}`);
    }

    // Generate state parameter for security (include workspaceId)
    const state = Buffer.from(JSON.stringify({ workspaceId, userId, platform })).toString('base64');

    let url: string;

    switch (platform) {
      case Platform.META:
        // Facebook/Meta OAuth URL
        url = 'https://www.facebook.com/v18.0/dialog/oauth?' +
          new URLSearchParams({
            client_id: oauthConfig.clientId,
            redirect_uri: oauthConfig.redirectUri,
            state,
            scope: 'pages_manage_posts,pages_read_engagement,instagram_basic,instagram_content_publish',
          }).toString();
        break;

      case Platform.X:
        // Twitter/X OAuth 2.0 URL
        url = 'https://twitter.com/i/oauth2/authorize?' +
          new URLSearchParams({
            response_type: 'code',
            client_id: oauthConfig.clientId,
            redirect_uri: oauthConfig.redirectUri,
            state,
            scope: 'tweet.read tweet.write users.read offline.access',
            code_challenge: 'challenge',
            code_challenge_method: 'plain',
          }).toString();
        break;

      case Platform.LINKEDIN:
        // LinkedIn OAuth URL
        url = 'https://www.linkedin.com/oauth/v2/authorization?' +
          new URLSearchParams({
            response_type: 'code',
            client_id: oauthConfig.clientId,
            redirect_uri: oauthConfig.redirectUri,
            state,
            scope: 'w_member_social r_organization_social',
          }).toString();
        break;

      case Platform.TIKTOK:
        // TikTok OAuth URL
        url = 'https://www.tiktok.com/v2/auth/authorize?' +
          new URLSearchParams({
            client_key: oauthConfig.clientId,
            response_type: 'code',
            redirect_uri: oauthConfig.redirectUri,
            state,
            scope: 'user.info.basic,video.publish',
          }).toString();
        break;

      default:
        throw new BadRequestException(`Unsupported platform: ${platform}`);
    }

    return { url };
  }

  async handleOAuthCallback(
    workspaceId: string,
    userId: string,
    platform: Platform,
    code: string,
    state: string,
  ) {
    // Verify state parameter
    try {
      const stateData = JSON.parse(Buffer.from(state, 'base64').toString());
      if (stateData.workspaceId !== workspaceId || stateData.platform !== platform) {
        throw new BadRequestException('Invalid state parameter');
      }
    } catch (error) {
      throw new BadRequestException('Invalid state parameter');
    }

    // Verify user has access to this workspace
    await this.verifyWorkspaceAccess(workspaceId, userId);

    const oauthConfig = this.configService.get(`oauth.${platform.toLowerCase()}`);

    if (!oauthConfig?.clientId || !oauthConfig?.clientSecret) {
      throw new BadRequestException(`OAuth not configured for ${platform}`);
    }

    // Exchange code for access token
    let tokenData: any;

    switch (platform) {
      case Platform.META:
        tokenData = await this.exchangeMetaToken(code, oauthConfig);
        break;
      case Platform.X:
        tokenData = await this.exchangeXToken(code, oauthConfig);
        break;
      case Platform.LINKEDIN:
        tokenData = await this.exchangeLinkedInToken(code, oauthConfig);
        break;
      case Platform.TIKTOK:
        tokenData = await this.exchangeTikTokToken(code, oauthConfig);
        break;
      default:
        throw new BadRequestException(`Unsupported platform: ${platform}`);
    }

    // Fetch user profile to get username and account ID
    const profile = await this.fetchPlatformProfile(platform, tokenData.accessToken);

    // Encrypt tokens before storing
    const encryptedAccessToken = this.encryptionService.encrypt(tokenData.accessToken);
    const encryptedRefreshToken = tokenData.refreshToken
      ? this.encryptionService.encrypt(tokenData.refreshToken)
      : null;

    // Calculate token expiration
    const tokenExpiresAt = tokenData.expiresIn
      ? new Date(Date.now() + tokenData.expiresIn * 1000)
      : null;

    // Store or update platform account
    const platformAccount = await this.db.platformAccount.upsert({
      where: {
        workspaceId_platform_platformAccountId: {
          workspaceId,
          platform,
          platformAccountId: profile.id,
        },
      },
      create: {
        workspaceId,
        platform,
        platformAccountId: profile.id,
        platformUsername: profile.username,
        accessToken: encryptedAccessToken,
        refreshToken: encryptedRefreshToken,
        tokenExpiresAt,
        isActive: true,
      },
      update: {
        platformUsername: profile.username,
        accessToken: encryptedAccessToken,
        refreshToken: encryptedRefreshToken,
        tokenExpiresAt,
        isActive: true,
      },
    });

    return {
      success: true,
      account: {
        id: platformAccount.id,
        platform: platformAccount.platform,
        username: platformAccount.platformUsername,
      },
    };
  }

  async disconnect(workspaceId: string, userId: string, accountId: string) {
    // Verify user has access to this workspace
    await this.verifyWorkspaceAccess(workspaceId, userId);

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

  private async verifyWorkspaceAccess(workspaceId: string, userId: string): Promise<void> {
    const membership = await this.db.workspaceMembership.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId,
          userId,
        },
      },
    });

    if (!membership) {
      throw new ForbiddenException('You do not have access to this workspace');
    }
  }

  private async exchangeMetaToken(code: string, config: any) {
    const response = await axios.post('https://graph.facebook.com/v18.0/oauth/access_token', null, {
      params: {
        client_id: config.clientId,
        client_secret: config.clientSecret,
        redirect_uri: config.redirectUri,
        code,
      },
    });

    return {
      accessToken: response.data.access_token,
      refreshToken: null, // Meta uses long-lived tokens
      expiresIn: response.data.expires_in,
    };
  }

  private async exchangeXToken(code: string, config: any) {
    const response = await axios.post('https://api.twitter.com/2/oauth2/token',
      new URLSearchParams({
        code,
        grant_type: 'authorization_code',
        client_id: config.clientId,
        redirect_uri: config.redirectUri,
        code_verifier: 'challenge',
      }).toString(),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        auth: {
          username: config.clientId,
          password: config.clientSecret,
        },
      }
    );

    return {
      accessToken: response.data.access_token,
      refreshToken: response.data.refresh_token,
      expiresIn: response.data.expires_in,
    };
  }

  private async exchangeLinkedInToken(code: string, config: any) {
    const response = await axios.post('https://www.linkedin.com/oauth/v2/accessToken',
      new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        client_id: config.clientId,
        client_secret: config.clientSecret,
        redirect_uri: config.redirectUri,
      }).toString(),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      }
    );

    return {
      accessToken: response.data.access_token,
      refreshToken: response.data.refresh_token,
      expiresIn: response.data.expires_in,
    };
  }

  private async exchangeTikTokToken(code: string, config: any) {
    const response = await axios.post('https://open.tiktokapis.com/v2/oauth/token/',
      {
        client_key: config.clientId,
        client_secret: config.clientSecret,
        code,
        grant_type: 'authorization_code',
        redirect_uri: config.redirectUri,
      },
      {
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    return {
      accessToken: response.data.access_token,
      refreshToken: response.data.refresh_token,
      expiresIn: response.data.expires_in,
    };
  }

  private async fetchPlatformProfile(platform: Platform, accessToken: string) {
    switch (platform) {
      case Platform.META:
        const metaResponse = await axios.get('https://graph.facebook.com/v18.0/me', {
          params: {
            fields: 'id,name',
            access_token: accessToken,
          },
        });
        return {
          id: metaResponse.data.id,
          username: metaResponse.data.name,
        };

      case Platform.X:
        const xResponse = await axios.get('https://api.twitter.com/2/users/me', {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          },
        });
        return {
          id: xResponse.data.data.id,
          username: xResponse.data.data.username,
        };

      case Platform.LINKEDIN:
        const linkedInResponse = await axios.get('https://api.linkedin.com/v2/userinfo', {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          },
        });
        return {
          id: linkedInResponse.data.sub,
          username: linkedInResponse.data.name,
        };

      case Platform.TIKTOK:
        const tiktokResponse = await axios.post('https://open.tiktokapis.com/v2/user/info/',
          {
            fields: ['open_id', 'display_name'],
          },
          {
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
            },
          }
        );
        return {
          id: tiktokResponse.data.data.user.open_id,
          username: tiktokResponse.data.data.user.display_name,
        };

      default:
        throw new BadRequestException(`Unsupported platform: ${platform}`);
    }
  }
}
