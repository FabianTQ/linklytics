import { Module } from '@nestjs/common';
import { RateLimitGuard } from '../common/guards/rate-limit.guard';
import { ClickRecorderService } from '../clicks/click-recorder.service';
import { RedirectController } from './redirect.controller';
import { RedirectService } from './redirect.service';

@Module({
  controllers: [RedirectController],
  providers: [RedirectService, ClickRecorderService, RateLimitGuard],
})
export class RedirectModule {}
