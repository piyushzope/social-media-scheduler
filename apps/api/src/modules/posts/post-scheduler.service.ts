import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PostStatus } from '@social/database';

import { DatabaseService } from '@/common/database/database.service';
import { PlatformPublisherService } from '../platforms/platform-publisher.service';

@Injectable()
export class PostSchedulerService {
  private readonly logger = new Logger(PostSchedulerService.name);
  private isProcessing = false;

  constructor(
    private readonly db: DatabaseService,
    private readonly platformPublisher: PlatformPublisherService,
  ) {}

  // Run every minute to check for scheduled posts
  @Cron(CronExpression.EVERY_MINUTE)
  async processScheduledPosts() {
    if (this.isProcessing) {
      this.logger.debug('Already processing scheduled posts, skipping...');
      return;
    }

    this.isProcessing = true;
    this.logger.debug('Checking for scheduled posts...');

    try {
      // Find posts that are scheduled and due to be published
      const now = new Date();
      const scheduledPosts = await this.db.post.findMany({
        where: {
          status: PostStatus.SCHEDULED,
          scheduledAt: {
            lte: now,
          },
        },
        include: {
          platforms: {
            include: {
              account: true,
            },
          },
        },
        take: 10, // Process max 10 posts per run
      });

      if (scheduledPosts.length === 0) {
        this.logger.debug('No scheduled posts found');
        return;
      }

      this.logger.log(`Found ${scheduledPosts.length} posts to publish`);

      // Process each post
      for (const post of scheduledPosts) {
        await this.publishPost(post);
      }
    } catch (error) {
      this.logger.error('Error processing scheduled posts:', error);
    } finally {
      this.isProcessing = false;
    }
  }

  private async publishPost(post: any) {
    this.logger.log(`Publishing post ${post.id}...`);

    try {
      // Update post status to PUBLISHING
      await this.db.post.update({
        where: { id: post.id },
        data: { status: PostStatus.PUBLISHING },
      });

      let allSuccessful = true;
      const errors: string[] = [];

      // Publish to each platform
      for (const platformConfig of post.platforms) {
        this.logger.debug(
          `Publishing to ${platformConfig.platform} for account ${platformConfig.account.platformUsername}`
        );

        try {
          // Use platform-specific content if available, otherwise use main content
          const content = platformConfig.content || post.content;
          const mediaUrls = platformConfig.mediaUrls.length > 0
            ? platformConfig.mediaUrls
            : post.mediaUrls;
          const hashtags = platformConfig.hashtags || [];

          // Publish to platform
          const result = await this.platformPublisher.publishToPlatform(
            platformConfig.platform,
            content,
            mediaUrls,
            hashtags,
            platformConfig.account.accessToken,
            platformConfig.account.platformAccountId,
          );

          // Update platform config status
          if (result.success) {
            await this.db.postPlatformConfig.update({
              where: { id: platformConfig.id },
              data: {
                status: PostStatus.PUBLISHED,
                publishedPostId: result.platformPostId,
                publishedAt: new Date(),
              },
            });

            this.logger.log(
              `Successfully published to ${platformConfig.platform}: ${result.platformPostId}`
            );
          } else {
            allSuccessful = false;
            errors.push(`${platformConfig.platform}: ${result.error}`);

            await this.db.postPlatformConfig.update({
              where: { id: platformConfig.id },
              data: {
                status: PostStatus.FAILED,
                failureReason: result.error,
              },
            });

            this.logger.error(
              `Failed to publish to ${platformConfig.platform}: ${result.error}`
            );
          }
        } catch (error) {
          allSuccessful = false;
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          errors.push(`${platformConfig.platform}: ${errorMessage}`);

          await this.db.postPlatformConfig.update({
            where: { id: platformConfig.id },
            data: {
              status: PostStatus.FAILED,
              failureReason: errorMessage,
            },
          });

          this.logger.error(
            `Exception publishing to ${platformConfig.platform}:`,
            error
          );
        }
      }

      // Update main post status
      if (allSuccessful) {
        await this.db.post.update({
          where: { id: post.id },
          data: {
            status: PostStatus.PUBLISHED,
            publishedAt: new Date(),
          },
        });

        this.logger.log(`Post ${post.id} published successfully to all platforms`);
      } else {
        await this.db.post.update({
          where: { id: post.id },
          data: {
            status: PostStatus.FAILED,
          },
        });

        this.logger.warn(
          `Post ${post.id} partially failed. Errors: ${errors.join('; ')}`
        );
      }
    } catch (error) {
      this.logger.error(`Error publishing post ${post.id}:`, error);

      // Update post status to FAILED
      await this.db.post.update({
        where: { id: post.id },
        data: { status: PostStatus.FAILED },
      });
    }
  }

  // Manual method to publish a specific post immediately
  async publishPostNow(postId: string): Promise<void> {
    const post = await this.db.post.findUnique({
      where: { id: postId },
      include: {
        platforms: {
          include: {
            account: true,
          },
        },
      },
    });

    if (!post) {
      throw new Error('Post not found');
    }

    await this.publishPost(post);
  }
}
