import { Module } from '@nestjs/common';

import { PostsController } from './posts.controller';
import { PostsService } from './posts.service';
import { PostSchedulerService } from './post-scheduler.service';
import { PlatformsModule } from '../platforms/platforms.module';

@Module({
  imports: [PlatformsModule],
  controllers: [PostsController],
  providers: [PostsService, PostSchedulerService],
  exports: [PostsService],
})
export class PostsModule {}
