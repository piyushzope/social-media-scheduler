import { Module } from '@nestjs/common';

import { PlatformsController } from './platforms.controller';
import { PlatformsService } from './platforms.service';
import { PlatformPublisherService } from './platform-publisher.service';

@Module({
  controllers: [PlatformsController],
  providers: [PlatformsService, PlatformPublisherService],
  exports: [PlatformsService, PlatformPublisherService],
})
export class PlatformsModule {}
