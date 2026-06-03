import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import {
  type BlockType,
  type CmsKernel,
  type ContentItem,
  type ContentType,
  type MediaAsset,
  type ThemeLayout,
  type ThemeTemplate,
  type User,
} from '../../main';
import { CMS_CURRENT_USER, CMS_KERNEL } from './cms-kernel.provider';

export interface CreateContentDto {
  title?: string;
  slug?: string;
  excerpt?: string;
  body?: string;
  blocks?: ContentItem['blocks'];
  categoryIds?: string[];
  tagIds?: string[];
  scheduledFor?: string;
  publishedAt?: string;
}

export interface AddBlockDto {
  type: BlockType;
  data?: Record<string, unknown>;
  position?: number;
}

export interface UpdateBlockDto {
  data?: Record<string, unknown>;
}

export interface ReorderBlocksDto {
  blockIds: string[];
}

export interface UploadMediaDto extends Omit<MediaAsset, 'id' | 'createdAt' | 'createdBy'> {
  createdBy?: string;
}

export interface UpdateThemeLayoutDto extends ThemeLayout {
  preview?: boolean;
}

@Injectable()
export class ApiService {
  constructor(
    @Inject(CMS_KERNEL) private readonly cms: CmsKernel,
    @Inject(CMS_CURRENT_USER) private readonly currentUser: User,
  ) {}

  listContentTypes() {
    return this.cms.contentTypes.list();
  }

  listContent(type: ContentType) {
    return this.cms.content.listAdmin(type).map((item) => this.cms.content.toRestResource(item));
  }

  createContent(type: ContentType, dto: CreateContentDto = {}) {
    const item = this.cms.content.createDraft(type, this.currentUser, {
      title: dto.title,
      slug: dto.slug,
      excerpt: dto.excerpt,
      body: dto.body,
      blocks: dto.blocks,
      categoryIds: dto.categoryIds,
      tagIds: dto.tagIds,
      scheduledFor: dto.scheduledFor ? new Date(dto.scheduledFor) : undefined,
      publishedAt: dto.publishedAt ? new Date(dto.publishedAt) : undefined,
    });
    return this.cms.content.toRestResource(item);
  }

  readContent(type: ContentType, slug: string) {
    const item = this.cms.content.findBySlug(type, slug);
    if (!item) {
      throw new NotFoundException(`Content item not found: ${type}/${slug}`);
    }
    return this.cms.content.toRestResource(item);
  }

  updateContent(contentId: string, dto: CreateContentDto = {}) {
    const item = this.cms.content.updateDraft(contentId, this.currentUser, {
      title: dto.title,
      slug: dto.slug,
      excerpt: dto.excerpt,
      body: dto.body,
      blocks: dto.blocks,
      categoryIds: dto.categoryIds,
      tagIds: dto.tagIds,
      scheduledFor: dto.scheduledFor ? new Date(dto.scheduledFor) : undefined,
      publishedAt: dto.publishedAt ? new Date(dto.publishedAt) : undefined,
    });
    return this.cms.content.toRestResource(item);
  }

  createDraft(type: ContentType, dto: CreateContentDto = {}) {
    return this.createContent(type, dto);
  }

  addBlock(contentId: string, dto: AddBlockDto) {
    const item = this.cms.content.addBlock(contentId, dto.type, this.currentUser, dto.data, dto.position);
    return this.cms.content.toRestResource(item);
  }

  updateBlock(contentId: string, blockId: string, dto: UpdateBlockDto) {
    const item = this.cms.content.updateBlock(contentId, blockId, this.currentUser, dto.data ?? {});
    return this.cms.content.toRestResource(item);
  }

  removeBlock(contentId: string, blockId: string) {
    const item = this.cms.content.removeBlock(contentId, blockId, this.currentUser);
    return this.cms.content.toRestResource(item);
  }

  reorderBlocks(contentId: string, dto: ReorderBlocksDto) {
    const item = this.cms.content.reorderBlocks(contentId, dto.blockIds, this.currentUser);
    return this.cms.content.toRestResource(item);
  }

  previewContent(contentId: string) {
    return this.cms.content.preview(contentId, this.currentUser);
  }

  publishContent(contentId: string) {
    return this.cms.content.toRestResource(this.cms.content.publish(contentId, this.currentUser));
  }

  queryGraphQl(type?: ContentType) {
    return { data: { content: this.cms.content.queryGraphQlContent(type) } };
  }

  listBlocks() {
    return this.cms.blocks.list();
  }

  listMedia() {
    return this.cms.media.list();
  }

  uploadMedia(dto: UploadMediaDto) {
    return this.cms.media.upload(
      {
        filename: dto.filename,
        url: dto.url,
        mimeType: dto.mimeType,
        sizeBytes: dto.sizeBytes,
        alt: dto.alt,
        createdBy: dto.createdBy ?? this.currentUser.id,
      },
      this.currentUser,
    );
  }

  me() {
    return this.currentUser;
  }

  listPlugins() {
    return this.cms.plugins.list();
  }

  listThemes() {
    return this.cms.themes.list();
  }

  getActiveThemeLayout(template: ThemeTemplate = 'home', preview = false) {
    const layout = this.cms.themes.getActiveLayout(template, preview);
    if (!layout) {
      throw new NotFoundException(`Active theme layout not found: ${template}`);
    }
    return layout;
  }

  updateActiveThemeLayout(dto: UpdateThemeLayoutDto) {
    return this.cms.themes.updateActiveLayout(dto.template ?? 'home', dto, this.currentUser, dto.preview ?? false);
  }
}
