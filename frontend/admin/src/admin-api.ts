export interface ContentResource {
  id: string;
  type: string;
  title: string;
  slug: string;
  excerpt?: string;
  body?: string;
  status?: string;
  authorId?: string;
  blocks?: unknown[];
  categoryIds?: string[];
  tagIds?: string[];
  publishedAt?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface MediaAsset {
  id: string;
  filename: string;
  url: string;
  mimeType: string;
  sizeBytes: number;
  alt?: string;
  createdBy?: string;
  createdAt?: string;
}

export interface ThemeManifest {
  name: string;
  version: string;
  description?: string;
  templates?: Record<string, string>;
}

export interface PluginManifest {
  name: string;
  version: string;
  description?: string;
  hooks?: string[];
  contentTypes?: unknown[];
  blocks?: unknown[];
}

export interface ContentTypeFieldSchema {
  name: string;
  label: string;
  kind: string;
  required?: boolean;
  multiple?: boolean;
  relationTo?: string;
}

export interface ContentTypeSchema {
  slug: string;
  title: string;
  description?: string;
  collectionName: string;
  fields: ContentTypeFieldSchema[];
  defaultStatus: string;
  api: {
    rest: boolean;
    graphql: boolean;
    publicRead: boolean;
  };
}

export interface ApiRouteInfo {
  method: string;
  path: string;
  module?: string;
  name: string;
  requiredPermission?: string;
  headlessReady?: boolean;
}

export class AdminApiError extends Error {
  constructor(message: string, readonly status?: number) {
    super(message);
  }
}

export async function fetchJson<T>(path: string, token?: string | null, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers);
  headers.set('Accept', 'application/json');
  if (options.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(path, { ...options, headers });
  if (!response.ok) {
    throw new AdminApiError(`API request failed: ${path}`, response.status);
  }

  return (await response.json()) as T;
}

export function formatDate(value?: string): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('ru-RU', { dateStyle: 'medium', timeStyle: 'short' }).format(date);
}

export function formatBytes(value?: number): string {
  if (!value) return '0 Б';
  const units = ['Б', 'КБ', 'МБ', 'ГБ'];
  let size = value;
  let index = 0;
  while (size >= 1024 && index < units.length - 1) {
    size /= 1024;
    index += 1;
  }
  return `${size.toFixed(index === 0 ? 0 : 1)} ${units[index]}`;
}
