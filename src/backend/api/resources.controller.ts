import { Body, Controller, Get, Patch, Post, Query, Req } from '@nestjs/common';
import type { Request } from 'express';
import { ApiService, type UpdateThemeLayoutDto, type UploadMediaDto } from './api.service';
import { type ThemeTemplate } from '../../main';
import { AuthService } from '../auth.service';

@Controller('api')
export class ResourcesController {
  constructor(
    private readonly api: ApiService,
    private readonly auth: AuthService,
  ) {}

  @Get('blocks')
  listBlocks() {
    return this.api.listBlocks();
  }

  @Get('media')
  listMedia() {
    return this.api.listMedia();
  }

  @Post('media')
  uploadMedia(@Body() body: UploadMediaDto) {
    return this.api.uploadMedia(body);
  }

  @Get('users/me')
  me(@Req() request: Request) {
    return this.auth.getCurrentUser(request);
  }

  @Get('plugins')
  listPlugins() {
    return this.api.listPlugins();
  }

  @Get('themes')
  listThemes() {
    return this.api.listThemes();
  }

  @Get('themes/active/layout')
  getActiveThemeLayout(@Query('template') template?: ThemeTemplate, @Query('preview') preview?: string) {
    return this.api.getActiveThemeLayout(template, preview === 'true');
  }

  @Patch('themes/active/layout')
  updateActiveThemeLayout(@Body() body: UpdateThemeLayoutDto) {
    return this.api.updateActiveThemeLayout(body);
  }
}
