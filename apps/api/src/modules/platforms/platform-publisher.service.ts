import { Injectable, Logger } from '@nestjs/common';
import { Platform } from '@social/database';
import axios from 'axios';

import { EncryptionService } from '@/common/encryption/encryption.service';

interface PublishResult {
  success: boolean;
  platformPostId?: string;
  error?: string;
}

@Injectable()
export class PlatformPublisherService {
  private readonly logger = new Logger(PlatformPublisherService.name);

  constructor(private readonly encryptionService: EncryptionService) {}

  async publishToMeta(
    content: string,
    mediaUrls: string[],
    hashtags: string[],
    accessToken: string,
  ): Promise<PublishResult> {
    try {
      const decryptedToken = this.encryptionService.decrypt(accessToken);

      // Get user's pages (for Facebook/Instagram posting)
      const pagesResponse = await axios.get(
        'https://graph.facebook.com/v18.0/me/accounts',
        {
          params: {
            access_token: decryptedToken,
          },
        }
      );

      if (!pagesResponse.data.data || pagesResponse.data.data.length === 0) {
        throw new Error('No Facebook pages found');
      }

      const page = pagesResponse.data.data[0];
      const pageAccessToken = page.access_token;

      // Prepare message with hashtags
      const message = hashtags.length > 0
        ? `${content}\n\n${hashtags.map(tag => `#${tag}`).join(' ')}`
        : content;

      // Publish to Facebook Page
      const postData: any = { message };

      if (mediaUrls.length > 0) {
        // For posts with media
        postData.url = mediaUrls[0]; // Use first media URL
      }

      const publishResponse = await axios.post(
        `https://graph.facebook.com/v18.0/${page.id}/feed`,
        postData,
        {
          params: {
            access_token: pageAccessToken,
          },
        }
      );

      return {
        success: true,
        platformPostId: publishResponse.data.id,
      };
    } catch (error) {
      this.logger.error('Failed to publish to Meta:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  async publishToX(
    content: string,
    mediaUrls: string[],
    hashtags: string[],
    accessToken: string,
  ): Promise<PublishResult> {
    try {
      const decryptedToken = this.encryptionService.decrypt(accessToken);

      // Prepare tweet text with hashtags
      const tweetText = hashtags.length > 0
        ? `${content}\n\n${hashtags.map(tag => `#${tag}`).join(' ')}`
        : content;

      // Create tweet
      const response = await axios.post(
        'https://api.twitter.com/2/tweets',
        {
          text: tweetText.substring(0, 280), // Twitter character limit
        },
        {
          headers: {
            'Authorization': `Bearer ${decryptedToken}`,
            'Content-Type': 'application/json',
          },
        }
      );

      return {
        success: true,
        platformPostId: response.data.data.id,
      };
    } catch (error) {
      this.logger.error('Failed to publish to X:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  async publishToLinkedIn(
    content: string,
    mediaUrls: string[],
    hashtags: string[],
    accessToken: string,
    userId: string,
  ): Promise<PublishResult> {
    try {
      const decryptedToken = this.encryptionService.decrypt(accessToken);

      // Prepare text with hashtags
      const text = hashtags.length > 0
        ? `${content}\n\n${hashtags.map(tag => `#${tag}`).join(' ')}`
        : content;

      // Create LinkedIn post (UGC post)
      const postData: any = {
        author: `urn:li:person:${userId}`,
        lifecycleState: 'PUBLISHED',
        specificContent: {
          'com.linkedin.ugc.ShareContent': {
            shareCommentary: {
              text,
            },
            shareMediaCategory: mediaUrls.length > 0 ? 'ARTICLE' : 'NONE',
          },
        },
        visibility: {
          'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC',
        },
      };

      if (mediaUrls.length > 0) {
        postData.specificContent['com.linkedin.ugc.ShareContent'].media = [
          {
            status: 'READY',
            originalUrl: mediaUrls[0],
          },
        ];
      }

      const response = await axios.post(
        'https://api.linkedin.com/v2/ugcPosts',
        postData,
        {
          headers: {
            'Authorization': `Bearer ${decryptedToken}`,
            'Content-Type': 'application/json',
            'X-Restli-Protocol-Version': '2.0.0',
          },
        }
      );

      return {
        success: true,
        platformPostId: response.data.id,
      };
    } catch (error) {
      this.logger.error('Failed to publish to LinkedIn:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  async publishToTikTok(
    content: string,
    mediaUrls: string[],
    hashtags: string[],
    accessToken: string,
  ): Promise<PublishResult> {
    try {
      const decryptedToken = this.encryptionService.decrypt(accessToken);

      if (mediaUrls.length === 0) {
        throw new Error('TikTok requires video content');
      }

      // Prepare caption with hashtags
      const caption = hashtags.length > 0
        ? `${content} ${hashtags.map(tag => `#${tag}`).join(' ')}`
        : content;

      // Note: TikTok video publishing is complex and requires:
      // 1. Video upload to their servers first
      // 2. Then creating the post with the uploaded video ID
      // This is a simplified version

      const response = await axios.post(
        'https://open.tiktokapis.com/v2/post/publish/video/init/',
        {
          post_info: {
            title: caption.substring(0, 150),
            privacy_level: 'PUBLIC_TO_EVERYONE',
            disable_comment: false,
            disable_duet: false,
            disable_stitch: false,
            video_cover_timestamp_ms: 1000,
          },
          source_info: {
            source: 'PULL_FROM_URL',
            video_url: mediaUrls[0],
          },
        },
        {
          headers: {
            'Authorization': `Bearer ${decryptedToken}`,
            'Content-Type': 'application/json',
          },
        }
      );

      return {
        success: true,
        platformPostId: response.data.data?.publish_id || 'tiktok_post',
      };
    } catch (error) {
      this.logger.error('Failed to publish to TikTok:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  async publishToPlatform(
    platform: Platform,
    content: string,
    mediaUrls: string[],
    hashtags: string[],
    accessToken: string,
    platformUserId?: string,
  ): Promise<PublishResult> {
    switch (platform) {
      case Platform.META:
        return this.publishToMeta(content, mediaUrls, hashtags, accessToken);

      case Platform.X:
        return this.publishToX(content, mediaUrls, hashtags, accessToken);

      case Platform.LINKEDIN:
        return this.publishToLinkedIn(content, mediaUrls, hashtags, accessToken, platformUserId || '');

      case Platform.TIKTOK:
        return this.publishToTikTok(content, mediaUrls, hashtags, accessToken);

      default:
        return {
          success: false,
          error: `Unsupported platform: ${platform}`,
        };
    }
  }
}
