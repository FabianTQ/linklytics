import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { RateLimitGuard } from '../common/guards/rate-limit.guard';
import { LinksController } from './links.controller';
import { LinksService } from './links.service';

@Module({
  imports: [AuthModule],
  controllers: [LinksController],
  providers: [LinksService, RateLimitGuard],
  exports: [LinksService],
})
export class LinksModule {}
