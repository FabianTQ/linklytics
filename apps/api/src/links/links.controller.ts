import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { RateLimit } from '../common/decorators/rate-limit.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RateLimitGuard } from '../common/guards/rate-limit.guard';
import type { AuthenticatedUser } from '../common/types/authenticated-user';
import { CreateLinkDto } from './dto/create-link.dto';
import { UpdateLinkDto } from './dto/update-link.dto';
import { LinksService, type LinkView, type PaginatedLinks } from './links.service';

@Controller('api/links')
@UseGuards(JwtAuthGuard)
export class LinksController {
  constructor(private readonly links: LinksService) {}

  @Post()
  @UseGuards(RateLimitGuard)
  @RateLimit({ name: 'create', limit: 20, windowSeconds: 60 })
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateLinkDto): Promise<LinkView> {
    return this.links.create(user.id, dto);
  }

  @Get()
  list(
    @CurrentUser() user: AuthenticatedUser,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('q') q?: string,
  ): Promise<PaginatedLinks> {
    return this.links.findAllForUser(user.id, {
      page: page ? Number(page) : undefined,
      pageSize: pageSize ? Number(pageSize) : undefined,
      q,
    });
  }

  @Get(':id')
  getOne(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<LinkView> {
    return this.links.getOneOwned(user.id, id);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateLinkDto,
  ): Promise<LinkView> {
    return this.links.update(user.id, id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<void> {
    return this.links.remove(user.id, id);
  }
}
