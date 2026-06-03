import { Body, Controller, Get, Patch, Post, Query } from '@nestjs/common';
import { ApiService, type UpdateThemeLayoutDto, type UploadMediaDto } from './api.service';
import { type ThemeTemplate } from '../../main';

@Controller('api')
export class ResourcesController {
  constructor(private readonly api: ApiService) {}

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
  me() {
    return this.api.me();
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
