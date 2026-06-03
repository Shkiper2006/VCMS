/**
 * Minimal in-memory VCMS core.
 *
 * The module intentionally avoids framework-specific code so it can be used as
 * the domain layer behind a future NestJS API, React admin panel, CLI seeders,
 * tests, or static preview tooling.
 */

export type Role = 'admin' | 'editor' | 'author' | 'guest';

export type Permission =
  | 'admin:access'
  | 'content:create'
  | 'content:edit:any'
  | 'content:edit:own'
  | 'content:publish'
  | 'content:delete'
  | 'pages:manage'
  | 'users:manage'
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
    'users:manage',
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
    'site:view',
  ],
  author: ['admin:access', 'content:create', 'content:edit:own', 'site:view'],
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

export type ContentType = 'page' | 'post';
export type ContentStatus = 'draft' | 'scheduled' | 'published' | 'archived';

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

export interface ContentItem {
  id: string;
  type: ContentType;
  title: string;
  slug: string;
  excerpt?: string;
  body: string;
  status: ContentStatus;
  authorId: string;
  categoryIds: string[];
  tagIds: string[];
  scheduledFor?: Date;
  publishedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface ThemeManifest {
  name: string;
  version: string;
  description?: string;
  templates?: Partial<Record<ContentType | 'home' | 'category' | 'search', string>>;
}

export interface PluginManifest {
  name: string;
  version: string;
  description?: string;
  hooks?: string[];
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
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  path: string;
  area: 'admin' | 'public';
  name: string;
  requiredPermission?: Permission;
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

  constructor(private readonly authz = new AuthorizationService()) {}

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

  private save(input: Omit<ContentItem, 'id' | 'createdAt' | 'updatedAt'> | ContentItem, actor: User): ContentItem {
    const now = new Date();
    const existing = 'id' in input ? this.items.get(input.id) : undefined;
    if (existing && !this.canEdit(existing, actor)) {
      throw new Error('Permission denied: content ownership');
    }

    const item: ContentItem = {
      ...input,
      id: 'id' in input ? input.id : makeId(input.type),
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

  activate(manifest: ThemeManifest): ThemeManifest {
    this.activeTheme = manifest;
    return manifest;
  }

  current(): ThemeManifest | undefined {
    return this.activeTheme;
  }
}

export class PluginManager {
  private readonly plugins = new Map<string, PluginManifest>();

  constructor(private readonly hooks: HookBus) {}

  register(manifest: PluginManifest, setup?: (hooks: HookBus) => void): PluginManifest {
    this.plugins.set(manifest.name, manifest);
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
  { method: 'GET', path: '/admin/users', area: 'admin', name: 'Управление пользователями', requiredPermission: 'users:manage' },
];

export const PUBLIC_ROUTES: RouteDefinition[] = [
  { method: 'GET', path: '/', area: 'public', name: 'Главная страница', requiredPermission: 'site:view' },
  { method: 'GET', path: '/posts/:slug', area: 'public', name: 'Страница записи', requiredPermission: 'site:view' },
  { method: 'GET', path: '/category/:slug', area: 'public', name: 'Страница категории', requiredPermission: 'site:view' },
  { method: 'GET', path: '/search', area: 'public', name: 'Поиск', requiredPermission: 'site:view' },
];

export interface CmsKernel {
  authz: AuthorizationService;
  users: InMemoryUserService;
  content: ContentRepository;
  hooks: HookBus;
  themes: ThemeRegistry;
  plugins: PluginManager;
  routes: RouteDefinition[];
  bootstrap: () => Promise<string>;
}

export function createCmsKernel(): CmsKernel {
  const authz = new AuthorizationService();
  const users = new InMemoryUserService(authz);
  const content = new ContentRepository(authz);
  const hooks = new HookBus();
  const themes = new ThemeRegistry();
  const plugins = new PluginManager(hooks);

  return {
    authz,
    users,
    content,
    hooks,
    themes,
    plugins,
    routes: [...ADMIN_ROUTES, ...PUBLIC_ROUTES],
    bootstrap: async () => {
      await hooks.emit('cms.boot', { routes: [...ADMIN_ROUTES, ...PUBLIC_ROUTES] });
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
