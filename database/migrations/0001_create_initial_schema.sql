-- Initial MySQL schema for the VCMS feature set.
-- The TypeScript domain layer currently runs in-memory, while these tables
-- describe the persistent model expected by the future NestJS/MySQL API.

CREATE TABLE modules (
  name VARCHAR(191) PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  dependencies JSON NOT NULL,
  api_namespace VARCHAR(255) NOT NULL,
  enabled TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO modules (name, title, description, dependencies, api_namespace) VALUES
  ('core', 'Core kernel', 'Bootstrap, authorization, routing, hooks, API surface and headless configuration.', JSON_ARRAY(), '/api'),
  ('users', 'Users and access control', 'Users, roles, permissions and sessions.', JSON_ARRAY('core'), '/api/users'),
  ('content', 'Declarative content engine', 'Content items, content type schemas and page blocks.', JSON_ARRAY('core', 'users'), '/api/content'),
  ('media', 'Media library', 'Reusable images and files for content blocks.', JSON_ARRAY('core', 'users'), '/api/media'),
  ('themes', 'Theme registry', 'Optional server-side rendering themes.', JSON_ARRAY('core', 'content'), '/api/themes'),
  ('plugins', 'Plugin runtime', 'Hooks and custom content or block extensions.', JSON_ARRAY('core'), '/api/plugins');

CREATE TABLE users (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  role ENUM('admin', 'editor', 'author', 'guest') NOT NULL DEFAULT 'author',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE site_settings (
  id TINYINT(1) PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  site_name VARCHAR(255) NOT NULL,
  site_description TEXT NOT NULL,
  site_url VARCHAR(2048) NOT NULL,
  installed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE content_types (
  slug VARCHAR(191) PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  collection_name VARCHAR(191) NOT NULL UNIQUE,
  default_status ENUM('draft', 'scheduled', 'published', 'archived') NOT NULL DEFAULT 'draft',
  api_rest_enabled TINYINT(1) NOT NULL DEFAULT 1,
  api_graphql_enabled TINYINT(1) NOT NULL DEFAULT 1,
  public_read_enabled TINYINT(1) NOT NULL DEFAULT 1,
  `schema` JSON NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO content_types (slug, title, description, collection_name, `schema`) VALUES
  (
    'page',
    'Page',
    'Static or landing page assembled from reusable blocks.',
    'pages',
    '{"fields":[{"name":"title","kind":"string","required":true},{"name":"slug","kind":"string","required":true},{"name":"excerpt","kind":"text"},{"name":"blocks","kind":"blocks","required":true,"multiple":true}]}'
  ),
  (
    'post',
    'Post',
    'Editorial publication with body, categories and tags.',
    'posts',
    '{"fields":[{"name":"title","kind":"string","required":true},{"name":"slug","kind":"string","required":true},{"name":"excerpt","kind":"text"},{"name":"body","kind":"markdown","required":true},{"name":"categoryIds","kind":"relation","relationTo":"category","multiple":true},{"name":"tagIds","kind":"relation","relationTo":"tag","multiple":true}]}'
  );

CREATE TABLE categories (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  slug VARCHAR(191) NOT NULL UNIQUE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE tags (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  slug VARCHAR(191) NOT NULL UNIQUE,
  title VARCHAR(255) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE content_items (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  type VARCHAR(191) NOT NULL,
  title VARCHAR(255) NOT NULL,
  slug VARCHAR(191) NOT NULL,
  excerpt TEXT,
  body LONGTEXT NOT NULL,
  status ENUM('draft', 'scheduled', 'published', 'archived') NOT NULL DEFAULT 'draft',
  author_id CHAR(36) NOT NULL,
  scheduled_for TIMESTAMP NULL,
  published_at TIMESTAMP NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE (type, slug),
  CHECK ((status = 'scheduled' AND scheduled_for IS NOT NULL) OR (status <> 'scheduled')),
  CONSTRAINT content_items_type_fk FOREIGN KEY (type) REFERENCES content_types(slug) ON UPDATE CASCADE,
  CONSTRAINT content_items_author_fk FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE content_blocks (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  content_id CHAR(36) NOT NULL,
  position INT NOT NULL,
  type VARCHAR(191) NOT NULL,
  label VARCHAR(255),
  plugin_name VARCHAR(191),
  data JSON NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE (content_id, position),
  CHECK (type IN ('text', 'image', 'gallery', 'form', 'video') OR type LIKE 'plugin:%'),
  CONSTRAINT content_blocks_content_fk FOREIGN KEY (content_id) REFERENCES content_items(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE content_categories (
  content_id CHAR(36) NOT NULL,
  category_id CHAR(36) NOT NULL,
  PRIMARY KEY (content_id, category_id),
  CONSTRAINT content_categories_content_fk FOREIGN KEY (content_id) REFERENCES content_items(id) ON DELETE CASCADE,
  CONSTRAINT content_categories_category_fk FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE content_tags (
  content_id CHAR(36) NOT NULL,
  tag_id CHAR(36) NOT NULL,
  PRIMARY KEY (content_id, tag_id),
  CONSTRAINT content_tags_content_fk FOREIGN KEY (content_id) REFERENCES content_items(id) ON DELETE CASCADE,
  CONSTRAINT content_tags_tag_fk FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE media_assets (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  filename VARCHAR(255) NOT NULL,
  url VARCHAR(2048) NOT NULL,
  mime_type VARCHAR(255) NOT NULL,
  size_bytes BIGINT NOT NULL CHECK (size_bytes >= 0),
  alt TEXT,
  created_by CHAR(36) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT media_assets_created_by_fk FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE themes (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  name VARCHAR(191) NOT NULL UNIQUE,
  version VARCHAR(100) NOT NULL,
  description TEXT,
  is_active TINYINT(1) NOT NULL DEFAULT 0,
  active_theme_key TINYINT GENERATED ALWAYS AS (CASE WHEN is_active = 1 THEN 1 ELSE NULL END) STORED UNIQUE,
  manifest JSON NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE theme_layouts (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  theme_id CHAR(36) NOT NULL,
  template ENUM('home', 'page', 'post', 'category', 'search') NOT NULL,
  layout_json JSON NOT NULL,
  updated_by CHAR(36),
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE (theme_id, template),
  CONSTRAINT theme_layouts_theme_fk FOREIGN KEY (theme_id) REFERENCES themes(id) ON DELETE CASCADE,
  CONSTRAINT theme_layouts_updated_by_fk FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE plugins (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  name VARCHAR(191) NOT NULL UNIQUE,
  version VARCHAR(100) NOT NULL,
  description TEXT,
  is_enabled TINYINT(1) NOT NULL DEFAULT 0,
  manifest JSON NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE api_endpoints (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  kind ENUM('rest', 'graphql') NOT NULL,
  module_name VARCHAR(191) NOT NULL,
  method VARCHAR(20) NOT NULL,
  path VARCHAR(255) NOT NULL UNIQUE,
  name VARCHAR(255) NOT NULL,
  required_permission VARCHAR(255),
  headless_ready TINYINT(1) NOT NULL DEFAULT 1,
  CONSTRAINT api_endpoints_module_fk FOREIGN KEY (module_name) REFERENCES modules(name) ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE headless_settings (
  id TINYINT(1) PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  enabled TINYINT(1) NOT NULL DEFAULT 1,
  admin_client_path VARCHAR(255) NOT NULL DEFAULT '/admin',
  public_rendering ENUM('theme', 'headless', 'hybrid') NOT NULL DEFAULT 'hybrid',
  cors_origins JSON NOT NULL,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO headless_settings (id, cors_origins) VALUES (TRUE, JSON_ARRAY('*'));

CREATE INDEX content_items_status_scheduled_for_idx ON content_items (status, scheduled_for);
CREATE FULLTEXT INDEX content_items_title_body_search_idx ON content_items (title, body);
CREATE INDEX content_blocks_content_position_idx ON content_blocks (content_id, position);
CREATE INDEX media_assets_mime_type_idx ON media_assets (mime_type);
CREATE INDEX theme_layouts_theme_template_idx ON theme_layouts (theme_id, template);
