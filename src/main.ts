/**
 * Minimal in-memory VCMS core.
 *
 * The module intentionally avoids framework-specific code so it can be used as
 * the domain layer behind a future NestJS API, React admin panel, CLI seeders,
 * tests, or static preview tooling.
 */

export type ModuleName = 'core' | 'content' | 'users' | 'themes' | 'plugins' | 'media';

export interface ModuleManifest {
  name: ModuleName;
  title: string;
  description: string;
  dependencies: ModuleName[];
  apiNamespace: string;
  enabled: boolean;
}

export const CORE_MODULES: ModuleManifest[] = [
  {
    name: 'core',
    title: 'Core kernel',
    description: 'Bootstrap, authorization, routing, hooks, API surface and headless configuration.',
    dependencies: [],
    apiNamespace: '/api',
    enabled: true,
  },
  {
    name: 'users',
    title: 'Users and access control',
    description: 'Users, roles, permissions and sessions for administrators, editors, authors and guests.',
    dependencies: ['core'],
    apiNamespace: '/api/users',
    enabled: true,
  },
  {
    name: 'content',
    title: 'Declarative content engine',
    description: 'Content items, content type schemas, pages, posts, categories, tags and page blocks.',
    dependencies: ['core', 'users'],
    apiNamespace: '/api/content',
    enabled: true,
  },
  {
    name: 'media',
    title: 'Media library',
    description: 'Images, galleries, alternative text and reusable assets for content blocks.',
    dependencies: ['core', 'users'],
    apiNamespace: '/api/media',
    enabled: true,
  },
  {
    name: 'themes',
    title: 'Theme registry',
    description: 'Theme manifests, active theme selection and optional server-side rendering templates.',
    dependencies: ['core', 'content'],
    apiNamespace: '/api/themes',
    enabled: true,
  },
  {
    name: 'plugins',
    title: 'Plugin runtime',
    description: 'Plugin manifests, hooks and custom block/content extensions.',
    dependencies: ['core'],
    apiNamespace: '/api/plugins',
    enabled: true,
  },
];

export class ModuleRegistry {
  private readonly modules = new Map<ModuleName, ModuleManifest>();

  constructor(modules: ModuleManifest[] = CORE_MODULES) {
    modules.forEach((module) => this.register(module));
  }

  register(manifest: ModuleManifest): ModuleManifest {
    for (const dependency of manifest.dependencies) {
      if (!this.modules.has(dependency)) {
        throw new Error(`Module ${manifest.name} requires missing dependency: ${dependency}`);
      }
    }
    this.modules.set(manifest.name, manifest);
    return manifest;
  }

  get(name: ModuleName): ModuleManifest | undefined {
    return this.modules.get(name);
  }

  list(): ModuleManifest[] {
    return [...this.modules.values()];
  }
}

export type Role = 'admin' | 'editor' | 'author' | 'guest';

export type Permission =
  | 'admin:access'
  | 'content:create'
  | 'content:edit:any'
  | 'content:edit:own'
  | 'content:publish'
  | 'content:delete'
  | 'pages:manage'
  | 'media:manage'
  | 'users:manage'
  | 'themes:manage'
  | 'site:view';

export const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  admin: [
    'admin:access',
    'content:create',
    'content:edit:any',
    'content:edit:own',
    'content:publish',
    'content:delete',
    'pages:manage',
    'media:manage',
    'users:manage',
    'themes:manage',
    'site:view',
  ],
  editor: [
    'admin:access',
    'content:create',
    'content:edit:any',
    'content:edit:own',
    'content:publish',
    'content:delete',
    'pages:manage',
    'media:manage',
    'themes:manage',
    'site:view',
  ],
  author: ['admin:access', 'content:create', 'content:edit:own', 'media:manage', 'site:view'],
  guest: ['site:view'],
};

export interface User {
  id: string;
  email: string;
  name: string;
  role: Role;
  passwordHash?: string;
  createdAt: Date;
}

export interface Session {
  token: string;
  user: User;
  issuedAt: Date;
}

export type ContentType = string;
export type ContentStatus = 'draft' | 'scheduled' | 'published' | 'archived';
export type FieldKind = 'string' | 'text' | 'markdown' | 'number' | 'boolean' | 'date' | 'relation' | 'blocks' | 'json';

export interface ContentTypeFieldSchema {
  name: string;
  label: string;
  kind: FieldKind;
  required?: boolean;
  localized?: boolean;
  multiple?: boolean;
  relationTo?: string;
}

export interface ContentTypeSchema {
  slug: ContentType;
  title: string;
  description?: string;
  collectionName: string;
  fields: ContentTypeFieldSchema[];
  defaultStatus: ContentStatus;
  api: {
    rest: boolean;
    graphql: boolean;
    publicRead: boolean;
  };
}

export const DEFAULT_CONTENT_TYPE_SCHEMAS: ContentTypeSchema[] = [
  {
    slug: 'page',
    title: 'Page',
    description: 'Static or landing page assembled from blocks.',
    collectionName: 'pages',
    defaultStatus: 'draft',
    api: { rest: true, graphql: true, publicRead: true },
    fields: [
      { name: 'title', label: 'Title', kind: 'string', required: true },
      { name: 'slug', label: 'Slug', kind: 'string', required: true },
      { name: 'excerpt', label: 'Meta description', kind: 'text' },
      { name: 'blocks', label: 'Page blocks', kind: 'blocks', required: true, multiple: true },
    ],
  },
  {
    slug: 'post',
    title: 'Post',
    description: 'Editorial publication with body, categories and tags.',
    collectionName: 'posts',
    defaultStatus: 'draft',
    api: { rest: true, graphql: true, publicRead: true },
    fields: [
      { name: 'title', label: 'Title', kind: 'string', required: true },
      { name: 'slug', label: 'Slug', kind: 'string', required: true },
      { name: 'excerpt', label: 'Excerpt', kind: 'text' },
      { name: 'body', label: 'Body', kind: 'markdown', required: true },
      { name: 'categoryIds', label: 'Categories', kind: 'relation', relationTo: 'category', multiple: true },
      { name: 'tagIds', label: 'Tags', kind: 'relation', relationTo: 'tag', multiple: true },
    ],
  },
];

export class ContentTypeRegistry {
  private readonly schemas = new Map<ContentType, ContentTypeSchema>();

  constructor(schemas: ContentTypeSchema[] = DEFAULT_CONTENT_TYPE_SCHEMAS) {
    schemas.forEach((schema) => this.register(schema));
  }

  register(schema: ContentTypeSchema): ContentTypeSchema {
    this.schemas.set(schema.slug, schema);
    return schema;
  }

  get(slug: ContentType): ContentTypeSchema | undefined {
    return this.schemas.get(slug);
  }

  list(): ContentTypeSchema[] {
    return [...this.schemas.values()];
  }

  validateContentType(slug: ContentType): void {
    if (!this.schemas.has(slug)) {
      throw new Error(`Unknown content type: ${slug}`);
    }
  }
}

export interface Category {
  id: string;
  slug: string;
  title: string;
  description?: string;
}

export interface Tag {
  id: string;
  slug: string;
  title: string;
}

export type BuiltInBlockType = 'text' | 'image' | 'gallery' | 'form';
export type BlockType = BuiltInBlockType | `plugin:${string}`;

export interface ContentBlock<TData extends Record<string, unknown> = Record<string, unknown>> {
  id: string;
  type: BlockType;
  label?: string;
  data: TData;
  pluginName?: string;
}

export interface BlockDefinition<TData extends Record<string, unknown> = Record<string, unknown>> {
  type: BlockType;
  title: string;
  description: string;
  providedBy: ModuleName | `plugin:${string}`;
  defaultData: TData;
}

export const BUILT_IN_BLOCKS: BlockDefinition[] = [
  {
    type: 'text',
    title: 'Text',
    description: 'Rich text or markdown fragment.',
    providedBy: 'content',
    defaultData: { text: '', format: 'markdown' },
  },
  {
    type: 'image',
    title: 'Image',
    description: 'Single image from the media library with alt text and caption.',
    providedBy: 'media',
    defaultData: { mediaId: '', alt: '', caption: '' },
  },
  {
    type: 'gallery',
    title: 'Gallery',
    description: 'Ordered collection of media items.',
    providedBy: 'media',
    defaultData: { mediaIds: [], layout: 'grid' },
  },
  {
    type: 'form',
    title: 'Form',
    description: 'Declarative form with fields and submit action.',
    providedBy: 'content',
    defaultData: { fields: [], submitLabel: 'Submit', action: 'email' },
  },
];

export class BlockRegistry {
  private readonly blocks = new Map<BlockType, BlockDefinition>();

  constructor(blocks: BlockDefinition[] = BUILT_IN_BLOCKS) {
    blocks.forEach((block) => this.register(block));
  }

  register(definition: BlockDefinition): BlockDefinition {
    this.blocks.set(definition.type, definition);
    return definition;
  }

  createBlock<TData extends Record<string, unknown>>(type: BlockType, data?: TData): ContentBlock<TData> {
    const definition = this.blocks.get(type);
    if (!definition) {
      throw new Error(`Unknown block type: ${type}`);
    }

    return {
      id: makeId('blk'),
      type,
      data: { ...definition.defaultData, ...data } as TData,
      pluginName: type.startsWith('plugin:') ? type.slice('plugin:'.length) : undefined,
    };
  }

  list(): BlockDefinition[] {
    return [...this.blocks.values()];
  }
}

export interface ContentItem {
  id: string;
  type: ContentType;
  title: string;
  slug: string;
  excerpt?: string;
  body: string;
  blocks?: ContentBlock[];
  status: ContentStatus;
  authorId: string;
  categoryIds: string[];
  tagIds: string[];
  scheduledFor?: Date;
  publishedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface MediaAsset {
  id: string;
  filename: string;
  url: string;
  mimeType: string;
  sizeBytes: number;
  alt?: string;
  createdBy: string;
  createdAt: Date;
}

export class MediaLibrary {
  private readonly assets = new Map<string, MediaAsset>();

  constructor(private readonly authz = new AuthorizationService()) {}

  upload(input: Omit<MediaAsset, 'id' | 'createdAt'>, actor: User): MediaAsset {
    this.authz.assert(actor, 'media:manage');
    const asset = { ...input, id: makeId('med'), createdAt: new Date() };
    this.assets.set(asset.id, asset);
    return asset;
  }

  list(): MediaAsset[] {
    return [...this.assets.values()];
  }
}

export type ThemeTemplate = ContentType | 'home' | 'category' | 'search';
export type ThemeBreakpoint = 'desktop' | 'tablet' | 'mobile';
export type ThemeEditableBlockKind = 'content' | 'slot' | 'text' | 'image' | BlockType;

export interface ThemeSpacing {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export interface ThemeResponsiveSettings {
  hidden?: boolean;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  margin?: Partial<ThemeSpacing>;
  padding?: Partial<ThemeSpacing>;
  order?: number;
}

export interface ThemeEditableBlock {
  id: string;
  template: ThemeTemplate;
  regionId: string;
  type: ThemeEditableBlockKind;
  label: string;
  x: number;
  y: number;
  width: number;
  height: number;
  order: number;
  margin: ThemeSpacing;
  padding: ThemeSpacing;
  settings?: Record<string, unknown>;
  responsive?: Partial<Record<ThemeBreakpoint, ThemeResponsiveSettings>>;
}

export interface ThemeRegion {
  id: string;
  template: ThemeTemplate;
  name: string;
  label: string;
  x: number;
  y: number;
  width: number;
  height: number;
  order: number;
  editable: boolean;
  blocks: ThemeEditableBlock[];
  responsive?: Partial<Record<ThemeBreakpoint, ThemeResponsiveSettings>>;
}

export interface ThemeLayout {
  themeId: string;
  template: ThemeTemplate;
  canvas: {
    width: number;
    height: number;
    breakpoint: ThemeBreakpoint;
  };
  regions: ThemeRegion[];
  updatedBy?: string;
  updatedAt?: Date;
  previewToken?: string;
}

export interface ThemeManifest {
  name: string;
  version: string;
  description?: string;
  templates?: Partial<Record<ThemeTemplate, string>>;
  regions?: ThemeRegion[];
  editableTemplates?: Partial<Record<ThemeTemplate, ThemeLayout>>;
}

export interface PluginManifest {
  name: string;
  version: string;
  description?: string;
  hooks?: string[];
  contentTypes?: ContentTypeSchema[];
  blocks?: BlockDefinition[];
}

export type HookName =
  | 'cms.boot'
  | 'user.login'
  | 'content.beforeSave'
  | 'content.afterSave'
  | 'content.beforePublish'
  | 'content.afterPublish'
  | 'public.beforeRender';

export type HookHandler<TPayload = unknown> = (payload: TPayload) => TPayload | void | Promise<TPayload | void>;

export interface RouteDefinition {
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  path: string;
  area: 'admin' | 'public' | 'api';
  name: string;
  requiredPermission?: Permission;
}

export type ApiKind = 'rest' | 'graphql';

export interface ApiEndpoint extends RouteDefinition {
  area: 'api';
  kind: ApiKind;
  module: ModuleName;
  headlessReady: boolean;
}

export interface HeadlessConfig {
  enabled: boolean;
  adminClientPath: string;
  publicRendering: 'theme' | 'headless' | 'hybrid';
  corsOrigins: string[];
}

export interface ApiSurface {
  rest: ApiEndpoint[];
  graphql: ApiEndpoint[];
  headless: HeadlessConfig;
}

export class AuthorizationService {
  can(user: Pick<User, 'role'> | undefined, permission: Permission): boolean {
    return ROLE_PERMISSIONS[user?.role ?? 'guest'].includes(permission);
  }

  assert(user: Pick<User, 'role'> | undefined, permission: Permission): void {
    if (!this.can(user, permission)) {
      throw new Error(`Permission denied: ${permission}`);
    }
  }
}

export class InMemoryUserService {
  private readonly users = new Map<string, User>();

  constructor(private readonly authz = new AuthorizationService()) {}

  createUser(input: Omit<User, 'id' | 'createdAt'>, actor?: User): User {
    if (this.users.size > 0) {
      this.authz.assert(actor, 'users:manage');
    }

    const user: User = {
      ...input,
      id: makeId('usr'),
      createdAt: new Date(),
    };
    this.users.set(user.id, user);
    return user;
  }

  listUsers(actor: User): User[] {
    this.authz.assert(actor, 'users:manage');
    return [...this.users.values()];
  }

  login(email: string, passwordHash: string): Session {
    const user = [...this.users.values()].find((candidate) => candidate.email === email);
    if (!user || user.passwordHash !== passwordHash) {
      throw new Error('Invalid credentials');
    }

    return {
      token: makeId('ses'),
      user,
      issuedAt: new Date(),
    };
  }
}

export class ContentRepository {
  private readonly categories = new Map<string, Category>();
  private readonly tags = new Map<string, Tag>();
  private readonly items = new Map<string, ContentItem>();

  constructor(
    private readonly authz = new AuthorizationService(),
    private readonly contentTypes = new ContentTypeRegistry(),
  ) {}

  createCategory(input: Omit<Category, 'id'>, actor: User): Category {
    this.authz.assert(actor, 'content:edit:any');
    const category = { ...input, id: makeId('cat') };
    this.categories.set(category.id, category);
    return category;
  }

  createTag(input: Omit<Tag, 'id'>, actor: User): Tag {
    this.authz.assert(actor, 'content:edit:any');
    const tag = { ...input, id: makeId('tag') };
    this.tags.set(tag.id, tag);
    return tag;
  }

  saveDraft(input: Omit<ContentItem, 'id' | 'status' | 'createdAt' | 'updatedAt'>, actor: User): ContentItem {
    this.authz.assert(actor, 'content:create');
    return this.save({ ...input, status: 'draft' }, actor);
  }

  publish(id: string, actor: User, publishedAt = new Date()): ContentItem {
    this.authz.assert(actor, 'content:publish');
    const item = this.getEditable(id, actor);
    return this.save({ ...item, status: 'published', publishedAt, scheduledFor: undefined }, actor);
  }

  schedule(id: string, actor: User, scheduledFor: Date): ContentItem {
    this.authz.assert(actor, 'content:publish');
    const item = this.getEditable(id, actor);
    return this.save({ ...item, status: 'scheduled', scheduledFor, publishedAt: undefined }, actor);
  }

  publishDue(now = new Date()): ContentItem[] {
    const published: ContentItem[] = [];
    for (const item of this.items.values()) {
      if (item.status === 'scheduled' && item.scheduledFor && item.scheduledFor <= now) {
        const updated = { ...item, status: 'published' as const, publishedAt: now, updatedAt: now };
        this.items.set(item.id, updated);
        published.push(updated);
      }
    }
    return published;
  }

  listAdmin(type?: ContentType): ContentItem[] {
    return [...this.items.values()].filter((item) => !type || item.type === type);
  }

  listPublished(type?: ContentType): ContentItem[] {
    return [...this.items.values()].filter(
      (item) => item.status === 'published' && (!type || item.type === type),
    );
  }

  findBySlug(type: ContentType, slug: string): ContentItem | undefined {
    return this.listPublished(type).find((item) => item.slug === slug);
  }

  findByCategory(categorySlug: string): ContentItem[] {
    const category = [...this.categories.values()].find((candidate) => candidate.slug === categorySlug);
    if (!category) {
      return [];
    }
    return this.listPublished('post').filter((item) => item.categoryIds.includes(category.id));
  }

  search(query: string): ContentItem[] {
    const normalized = query.trim().toLowerCase();
    if (!normalized) {
      return [];
    }
    return this.listPublished().filter((item) =>
      [item.title, item.excerpt, item.body].some((field) => field?.toLowerCase().includes(normalized)),
    );
  }

  toRestResource(item: ContentItem): Record<string, unknown> {
    return {
      id: item.id,
      type: item.type,
      title: item.title,
      slug: item.slug,
      excerpt: item.excerpt,
      body: item.body,
      blocks: item.blocks ?? [],
      status: item.status,
      publishedAt: item.publishedAt?.toISOString(),
      links: {
        self: `/api/content/${item.type}/${item.slug}`,
        collection: `/api/content/${item.type}`,
      },
    };
  }

  queryGraphQlContent(type?: ContentType): Record<string, unknown>[] {
    return this.listPublished(type).map((item) => this.toRestResource(item));
  }

  private save(input: Omit<ContentItem, 'id' | 'createdAt' | 'updatedAt'> | ContentItem, actor: User): ContentItem {
    this.contentTypes.validateContentType(input.type);
    const now = new Date();
    const existing = 'id' in input ? this.items.get(input.id) : undefined;
    if (existing && !this.canEdit(existing, actor)) {
      throw new Error('Permission denied: content ownership');
    }

    const item: ContentItem = {
      ...input,
      id: 'id' in input ? input.id : makeId(input.type),
      categoryIds: input.categoryIds ?? [],
      tagIds: input.tagIds ?? [],
      blocks: input.blocks ?? [],
      createdAt: 'createdAt' in input ? input.createdAt : now,
      updatedAt: now,
    };
    this.items.set(item.id, item);
    return item;
  }

  private getEditable(id: string, actor: User): ContentItem {
    const item = this.items.get(id);
    if (!item) {
      throw new Error(`Content not found: ${id}`);
    }
    if (!this.canEdit(item, actor)) {
      throw new Error('Permission denied: content ownership');
    }
    return item;
  }

  private canEdit(item: ContentItem, actor: User): boolean {
    return this.authz.can(actor, 'content:edit:any') ||
      (this.authz.can(actor, 'content:edit:own') && item.authorId === actor.id);
  }
}

export class HookBus {
  private readonly handlers = new Map<HookName, HookHandler[]>();

  on<TPayload>(hook: HookName, handler: HookHandler<TPayload>): void {
    const current = this.handlers.get(hook) ?? [];
    current.push(handler as HookHandler);
    this.handlers.set(hook, current);
  }

  async emit<TPayload>(hook: HookName, payload: TPayload): Promise<TPayload> {
    let nextPayload = payload;
    for (const handler of this.handlers.get(hook) ?? []) {
      const result = await handler(nextPayload);
      if (result !== undefined) {
        nextPayload = result as TPayload;
      }
    }
    return nextPayload;
  }
}

export class ThemeRegistry {
  private activeTheme?: ThemeManifest;
  private readonly manifests = new Map<string, ThemeManifest>();
  private readonly activeLayouts = new Map<ThemeTemplate, ThemeLayout>();
  private readonly previewLayouts = new Map<ThemeTemplate, ThemeLayout>();

  register(manifest: ThemeManifest): ThemeManifest {
    this.manifests.set(manifest.name, manifest);
    return manifest;
  }

  activate(manifest: ThemeManifest): ThemeManifest {
    this.register(manifest);
    this.activeTheme = manifest;
    this.activeLayouts.clear();
    Object.entries(manifest.editableTemplates ?? {}).forEach(([template, layout]) => {
      if (layout) {
        this.activeLayouts.set(template as ThemeTemplate, layout);
      }
    });
    return manifest;
  }

  list(): ThemeManifest[] {
    return [...this.manifests.values()];
  }

  current(): ThemeManifest | undefined {
    return this.activeTheme;
  }

  getActiveLayout(template: ThemeTemplate = 'home', preview = false): ThemeLayout | undefined {
    return (preview ? this.previewLayouts.get(template) : undefined) ??
      this.activeLayouts.get(template) ??
      this.activeTheme?.editableTemplates?.[template];
  }

  updateActiveLayout(template: ThemeTemplate, layout: ThemeLayout, actor: User, preview = false): ThemeLayout {
    const updated = {
      ...layout,
      template,
      themeId: layout.themeId || this.activeTheme?.name || 'active',
      updatedBy: actor.id,
      updatedAt: new Date(),
      previewToken: preview ? layout.previewToken ?? makeId('preview') : undefined,
    };
    if (preview) {
      this.previewLayouts.set(template, updated);
    } else {
      this.activeLayouts.set(template, updated);
      this.previewLayouts.delete(template);
    }
    return updated;
  }
}

export class PluginManager {
  private readonly plugins = new Map<string, PluginManifest>();

  constructor(
    private readonly hooks: HookBus,
    private readonly contentTypes: ContentTypeRegistry,
    private readonly blocks: BlockRegistry,
  ) {}

  register(manifest: PluginManifest, setup?: (hooks: HookBus) => void): PluginManifest {
    this.plugins.set(manifest.name, manifest);
    manifest.contentTypes?.forEach((schema) => this.contentTypes.register(schema));
    manifest.blocks?.forEach((block) => this.blocks.register(block));
    setup?.(this.hooks);
    return manifest;
  }

  list(): PluginManifest[] {
    return [...this.plugins.values()];
  }
}

export const ADMIN_ROUTES: RouteDefinition[] = [
  { method: 'POST', path: '/admin/login', area: 'admin', name: 'Вход в админ-панель' },
  { method: 'GET', path: '/admin', area: 'admin', name: 'Dashboard', requiredPermission: 'admin:access' },
  { method: 'GET', path: '/admin/posts', area: 'admin', name: 'Список записей', requiredPermission: 'admin:access' },
  { method: 'POST', path: '/admin/posts', area: 'admin', name: 'Редактор записи', requiredPermission: 'content:create' },
  { method: 'GET', path: '/admin/pages', area: 'admin', name: 'Управление страницами', requiredPermission: 'pages:manage' },
  { method: 'GET', path: '/admin/content-types', area: 'admin', name: 'Схемы типов контента', requiredPermission: 'admin:access' },
  { method: 'GET', path: '/admin/media', area: 'admin', name: 'Медиатека', requiredPermission: 'media:manage' },
  { method: 'GET', path: '/admin/themes', area: 'admin', name: 'Управление темами', requiredPermission: 'themes:manage' },
  { method: 'GET', path: '/admin/themes/editor', area: 'admin', name: 'Визуальный редактор темы', requiredPermission: 'themes:manage' },
  { method: 'GET', path: '/admin/users', area: 'admin', name: 'Управление пользователями', requiredPermission: 'users:manage' },
];

export const PUBLIC_ROUTES: RouteDefinition[] = [
  { method: 'GET', path: '/', area: 'public', name: 'Главная страница', requiredPermission: 'site:view' },
  { method: 'GET', path: '/posts/:slug', area: 'public', name: 'Страница записи', requiredPermission: 'site:view' },
  { method: 'GET', path: '/category/:slug', area: 'public', name: 'Страница категории', requiredPermission: 'site:view' },
  { method: 'GET', path: '/search', area: 'public', name: 'Поиск', requiredPermission: 'site:view' },
];

export const API_ROUTES: ApiEndpoint[] = [
  { method: 'GET', path: '/api/content-types', area: 'api', kind: 'rest', module: 'content', name: 'List content type schemas', headlessReady: true },
  { method: 'GET', path: '/api/content/:type', area: 'api', kind: 'rest', module: 'content', name: 'List content by type', headlessReady: true },
  { method: 'POST', path: '/api/content/:type', area: 'api', kind: 'rest', module: 'content', name: 'Create content item', requiredPermission: 'content:create', headlessReady: true },
  { method: 'GET', path: '/api/content/:type/:slug', area: 'api', kind: 'rest', module: 'content', name: 'Read content item', headlessReady: true },
  { method: 'PATCH', path: '/api/content/:type/:id', area: 'api', kind: 'rest', module: 'content', name: 'Update content item', requiredPermission: 'content:edit:own', headlessReady: true },
  { method: 'GET', path: '/api/blocks', area: 'api', kind: 'rest', module: 'content', name: 'List available block definitions', headlessReady: true },
  { method: 'GET', path: '/api/media', area: 'api', kind: 'rest', module: 'media', name: 'List media assets', headlessReady: true },
  { method: 'POST', path: '/api/media', area: 'api', kind: 'rest', module: 'media', name: 'Upload media asset', requiredPermission: 'media:manage', headlessReady: true },
  { method: 'GET', path: '/api/users/me', area: 'api', kind: 'rest', module: 'users', name: 'Current user profile', requiredPermission: 'admin:access', headlessReady: true },
  { method: 'GET', path: '/api/plugins', area: 'api', kind: 'rest', module: 'plugins', name: 'List plugins', requiredPermission: 'admin:access', headlessReady: true },
  { method: 'GET', path: '/api/themes', area: 'api', kind: 'rest', module: 'themes', name: 'List themes', requiredPermission: 'themes:manage', headlessReady: true },
  { method: 'GET', path: '/api/themes/active/layout', area: 'api', kind: 'rest', module: 'themes', name: 'Read active theme layout', requiredPermission: 'themes:manage', headlessReady: true },
  { method: 'PATCH', path: '/api/themes/active/layout', area: 'api', kind: 'rest', module: 'themes', name: 'Update active theme layout', requiredPermission: 'themes:manage', headlessReady: true },
  { method: 'POST', path: '/graphql', area: 'api', kind: 'graphql', module: 'content', name: 'GraphQL content API', headlessReady: true },
];

export const DEFAULT_HEADLESS_CONFIG: HeadlessConfig = {
  enabled: true,
  adminClientPath: '/admin',
  publicRendering: 'hybrid',
  corsOrigins: ['*'],
};

export function createApiSurface(headless: HeadlessConfig = DEFAULT_HEADLESS_CONFIG): ApiSurface {
  return {
    rest: API_ROUTES.filter((route) => route.kind === 'rest'),
    graphql: API_ROUTES.filter((route) => route.kind === 'graphql'),
    headless,
  };
}

export interface CmsKernel {
  modules: ModuleRegistry;
  authz: AuthorizationService;
  users: InMemoryUserService;
  contentTypes: ContentTypeRegistry;
  blocks: BlockRegistry;
  content: ContentRepository;
  media: MediaLibrary;
  hooks: HookBus;
  themes: ThemeRegistry;
  plugins: PluginManager;
  api: ApiSurface;
  routes: RouteDefinition[];
  bootstrap: () => Promise<string>;
}

export function createCmsKernel(): CmsKernel {
  const modules = new ModuleRegistry();
  const authz = new AuthorizationService();
  const users = new InMemoryUserService(authz);
  const contentTypes = new ContentTypeRegistry();
  const blocks = new BlockRegistry();
  const content = new ContentRepository(authz, contentTypes);
  const media = new MediaLibrary(authz);
  const hooks = new HookBus();
  const themes = new ThemeRegistry();
  const plugins = new PluginManager(hooks, contentTypes, blocks);
  const api = createApiSurface();
  const routes = [...ADMIN_ROUTES, ...PUBLIC_ROUTES, ...API_ROUTES];

  return {
    modules,
    authz,
    users,
    contentTypes,
    blocks,
    content,
    media,
    hooks,
    themes,
    plugins,
    api,
    routes,
    bootstrap: async () => {
      await hooks.emit('cms.boot', { modules: modules.list(), routes, api });
      return 'VCMS kernel bootstrapped';
    },
  };
}

export function bootstrap(): Promise<string> {
  return createCmsKernel().bootstrap();
}

function makeId(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}
