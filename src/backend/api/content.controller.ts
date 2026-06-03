import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { ApiService, type AddBlockDto, type CreateContentDto, type ReorderBlocksDto, type UpdateBlockDto } from './api.service';

@Controller('api')
export class ContentController {
  constructor(private readonly api: ApiService) {}

  @Get('content-types')
  listContentTypes() {
    return this.api.listContentTypes();
  }

  @Get('content/:type')
  listContent(@Param('type') type: string) {
    return this.api.listContent(type);
  }

  @Post('content/:type')
  createContent(@Param('type') type: string, @Body() body: CreateContentDto) {
    return this.api.createContent(type, body);
  }

  @Patch('content/:type/:id')
  updateContent(@Param('id') id: string, @Body() body: CreateContentDto) {
    return this.api.updateContent(id, body);
  }

  @Post('content/:type/drafts')
  createDraft(@Param('type') type: string, @Body() body: CreateContentDto) {
    return this.api.createDraft(type, body);
  }

  @Post('content/:type/:id/blocks')
  addBlock(@Param('id') id: string, @Body() body: AddBlockDto) {
    return this.api.addBlock(id, body);
  }

  @Patch('content/:type/:id/blocks/order')
  reorderBlocks(@Param('id') id: string, @Body() body: ReorderBlocksDto) {
    return this.api.reorderBlocks(id, body);
  }

  @Patch('content/:type/:id/blocks/:blockId')
  updateBlock(@Param('id') id: string, @Param('blockId') blockId: string, @Body() body: UpdateBlockDto) {
    return this.api.updateBlock(id, blockId, body);
  }

  @Delete('content/:type/:id/blocks/:blockId')
  removeBlock(@Param('id') id: string, @Param('blockId') blockId: string) {
    return this.api.removeBlock(id, blockId);
  }

  @Get('content/:type/:id/preview')
  previewContent(@Param('id') id: string) {
    return this.api.previewContent(id);
  }

  @Post('content/:type/:id/publish')
  publishContent(@Param('id') id: string) {
    return this.api.publishContent(id);
  }

  @Get('content/:type/:slug')
  readContent(@Param('type') type: string, @Param('slug') slug: string) {
    return this.api.readContent(type, slug);
  }
}
