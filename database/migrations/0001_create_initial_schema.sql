-- Initial PostgreSQL schema for the VCMS feature set.
-- The TypeScript domain layer currently runs in-memory, while these tables
-- describe the persistent model expected by the future NestJS/PostgreSQL API.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TYPE user_role AS ENUM ('admin', 'editor', 'author', 'guest');
CREATE TYPE content_status AS ENUM ('draft', 'scheduled', 'published', 'archived');
CREATE TYPE api_kind AS ENUM ('rest', 'graphql');
CREATE TYPE public_rendering_mode AS ENUM ('theme', 'headless', 'hybrid');

CREATE TABLE modules (
  name TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  dependencies TEXT[] NOT NULL DEFAULT '{}',
  api_namespace TEXT NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO modules (name, title, description, dependencies, api_namespace) VALUES
  ('core', 'Core kernel', 'Bootstrap, authorization, routing, hooks, API surface and headless configuration.', '{}', '/api'),
  ('users', 'Users and access control', 'Users, roles, permissions and sessions.', '{core}', '/api/users'),
  ('content', 'Declarative content engine', 'Content items, content type schemas and page blocks.', '{core,users}', '/api/content'),
  ('media', 'Media library', 'Reusable images and files for content blocks.', '{core,users}', '/api/media'),
  ('themes', 'Theme registry', 'Optional server-side rendering themes.', '{core,content}', '/api/themes'),
  ('plugins', 'Plugin runtime', 'Hooks and custom content or block extensions.', '{core}', '/api/plugins');

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  name TEXT NOT NULL,
  role user_role NOT NULL DEFAULT 'author',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE site_settings (
  id BOOLEAN PRIMARY KEY DEFAULT true CHECK (id),
  site_name TEXT NOT NULL,
  site_description TEXT NOT NULL DEFAULT '',
  site_url TEXT NOT NULL,
  installed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE content_types (
  slug TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  collection_name TEXT NOT NULL UNIQUE,
  default_status content_status NOT NULL DEFAULT 'draft',
  api_rest_enabled BOOLEAN NOT NULL DEFAULT true,
  api_graphql_enabled BOOLEAN NOT NULL DEFAULT true,
  public_read_enabled BOOLEAN NOT NULL DEFAULT true,
  schema JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO content_types (slug, title, description, collection_name, schema) VALUES
  (
    'page',
    'Page',
    'Static or landing page assembled from reusable blocks.',
    'pages',
    '{"fields":[{"name":"title","kind":"string","required":true},{"name":"slug","kind":"string","required":true},{"name":"excerpt","kind":"text"},{"name":"blocks","kind":"blocks","required":true,"multiple":true}]}'::jsonb
  ),
  (
    'post',
    'Post',
    'Editorial publication with body, categories and tags.',
    'posts',
    '{"fields":[{"name":"title","kind":"string","required":true},{"name":"slug","kind":"string","required":true},{"name":"excerpt","kind":"text"},{"name":"body","kind":"markdown","required":true},{"name":"categoryIds","kind":"relation","relationTo":"category","multiple":true},{"name":"tagIds","kind":"relation","relationTo":"tag","multiple":true}]}'::jsonb
  );

CREATE TABLE categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE content_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL REFERENCES content_types(slug) ON UPDATE CASCADE,
  title TEXT NOT NULL,
  slug TEXT NOT NULL,
  excerpt TEXT,
  body TEXT NOT NULL DEFAULT '',
  status content_status NOT NULL DEFAULT 'draft',
  author_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  scheduled_for TIMESTAMPTZ,
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (type, slug),
  CHECK (
    (status = 'scheduled' AND scheduled_for IS NOT NULL)
    OR (status <> 'scheduled')
  )
);

CREATE TABLE content_blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_id UUID NOT NULL REFERENCES content_items(id) ON DELETE CASCADE,
  position INTEGER NOT NULL,
  type TEXT NOT NULL,
  label TEXT,
  plugin_name TEXT,
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (content_id, position),
  CHECK (
    type IN ('text', 'image', 'gallery', 'form', 'video')
    OR type LIKE 'plugin:%'
  )
);

CREATE TABLE content_categories (
  content_id UUID NOT NULL REFERENCES content_items(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  PRIMARY KEY (content_id, category_id)
);

CREATE TABLE content_tags (
  content_id UUID NOT NULL REFERENCES content_items(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (content_id, tag_id)
);

CREATE TABLE media_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  filename TEXT NOT NULL,
  url TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  size_bytes BIGINT NOT NULL CHECK (size_bytes >= 0),
  alt TEXT,
  created_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE themes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  version TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT false,
  manifest JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX only_one_active_theme ON themes (is_active) WHERE is_active;

CREATE TABLE theme_layouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  theme_id UUID NOT NULL REFERENCES themes(id) ON DELETE CASCADE,
  template TEXT NOT NULL,
  layout_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (theme_id, template),
  CHECK (template IN ('home', 'page', 'post', 'category', 'search'))
);

CREATE TABLE plugins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  version TEXT NOT NULL,
  description TEXT,
  is_enabled BOOLEAN NOT NULL DEFAULT false,
  manifest JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE api_endpoints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kind api_kind NOT NULL,
  module_name TEXT NOT NULL REFERENCES modules(name) ON UPDATE CASCADE,
  method TEXT NOT NULL,
  path TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  required_permission TEXT,
  headless_ready BOOLEAN NOT NULL DEFAULT true
);

CREATE TABLE headless_settings (
  id BOOLEAN PRIMARY KEY DEFAULT true CHECK (id),
  enabled BOOLEAN NOT NULL DEFAULT true,
  admin_client_path TEXT NOT NULL DEFAULT '/admin',
  public_rendering public_rendering_mode NOT NULL DEFAULT 'hybrid',
  cors_origins TEXT[] NOT NULL DEFAULT '{*}',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO headless_settings (id) VALUES (true);

CREATE INDEX content_items_status_scheduled_for_idx ON content_items (status, scheduled_for);
CREATE INDEX content_items_title_body_search_idx ON content_items USING gin (to_tsvector('simple', title || ' ' || body));
CREATE INDEX content_blocks_content_position_idx ON content_blocks (content_id, position);
CREATE INDEX media_assets_mime_type_idx ON media_assets (mime_type);
CREATE INDEX theme_layouts_theme_template_idx ON theme_layouts (theme_id, template);
