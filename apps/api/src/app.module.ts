import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { join } from 'path';

import { AiModule } from './modules/ai/ai.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { AuthModule } from './modules/auth/auth.module';
import { EngagementModule } from './modules/engagement/engagement.module';
import { PlatformsModule } from './modules/platforms/platforms.module';
import { PostsModule } from './modules/posts/posts.module';
import { UsersModule } from './modules/users/users.module';
import { WorkspacesModule } from './modules/workspaces/workspaces.module';
import { DatabaseModule } from './common/database/database.module';
import { EncryptionModule } from './common/encryption/encryption.module';

import configuration from './config/configuration';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      envFilePath: join(__dirname, '../../../.env'),
    }),
    ScheduleModule.forRoot(),
    DatabaseModule,
    EncryptionModule,
    AuthModule,
    UsersModule,
    WorkspacesModule,
    PostsModule,
    PlatformsModule,
    AnalyticsModule,
    AiModule,
    EngagementModule,
  ],
})
export class AppModule {}
