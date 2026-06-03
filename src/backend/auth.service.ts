import { Injectable, UnauthorizedException } from '@nestjs/common';
import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import type { Request } from 'express';
import { ROLE_PERMISSIONS, type Permission, type Role, type User } from '../main';
import { CMS_CONTEXT } from './api/cms-kernel.provider';

export interface AuthenticatedUserProfile extends Omit<User, 'passwordHash' | 'createdAt'> {
  createdAt?: string;
  permissions: Permission[];
}

export interface LoginResult {
  token: string;
  user: AuthenticatedUserProfile;
}

interface StoredAuthUser {
  id: string;
  email: string;
  name: string;
  role: Role;
  passwordHash: string;
  createdAt?: string;
}

interface TokenPayload {
  sub: string;
  email: string;
  name: string;
  role: Role;
  iat: number;
  exp: number;
}

const TOKEN_TTL_SECONDS = 60 * 60 * 12;

@Injectable()
export class AuthService {
  private readonly secret = process.env.VCMS_AUTH_SECRET ?? randomBytes(32).toString('hex');

  async login(email: string, password: string): Promise<LoginResult> {
    const normalizedEmail = email.trim().toLowerCase();
    const storedUser = this.findUserInMySql(normalizedEmail) ?? this.findUserInKernel(normalizedEmail);

    if (!storedUser || !this.verifyPassword(password, storedUser.passwordHash)) {
      throw new UnauthorizedException('Invalid email or password');
    }

    return this.createLoginResult(storedUser);
  }

  getCurrentUser(request: Request): AuthenticatedUserProfile {
    const token = this.readBearerToken(request);
    if (!token) {
      throw new UnauthorizedException('Missing bearer token');
    }

    const payload = this.verifyToken(token);
    return this.toProfile({
      id: payload.sub,
      email: payload.email,
      name: payload.name,
      role: payload.role,
      passwordHash: '',
    });
  }

  private createLoginResult(user: StoredAuthUser): LoginResult {
    const now = Math.floor(Date.now() / 1000);
    const payload: TokenPayload = {
      sub: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      iat: now,
      exp: now + TOKEN_TTL_SECONDS,
    };

    return {
      token: this.signToken(payload),
      user: this.toProfile(user),
    };
  }

  private findUserInKernel(email: string): StoredAuthUser | undefined {
    const user = CMS_CONTEXT.kernel.users.findByEmail(email);
    if (!user?.passwordHash) {
      return undefined;
    }

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      passwordHash: user.passwordHash,
      createdAt: user.createdAt.toISOString(),
    };
  }

  private findUserInMySql(email: string): StoredAuthUser | undefined {
    if (process.env.DB_CONNECTION !== 'mysql' || !process.env.DB_DATABASE) {
      return undefined;
    }

    const phpBinary = process.env.VCMS_PHP_BINARY ?? 'php';
    const php = String.raw`
$input = json_decode(stream_get_contents(STDIN), true);
if (!is_array($input) || !isset($input['email'])) { exit(2); }
$dsn = sprintf(
    'mysql:host=%s;port=%s;dbname=%s;charset=utf8mb4',
    getenv('DB_HOST') ?: 'localhost',
    getenv('DB_PORT') ?: '3306',
    getenv('DB_DATABASE') ?: ''
);
$pdo = new PDO($dsn, getenv('DB_USERNAME') ?: '', getenv('DB_PASSWORD') ?: '', [
    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
]);
$stmt = $pdo->prepare('SELECT id, email, password_hash, name, role, created_at FROM users WHERE LOWER(email) = LOWER(:email) LIMIT 1');
$stmt->execute([':email' => $input['email']]);
$user = $stmt->fetch();
echo json_encode($user ?: null, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
`;

    const result = spawnSync(phpBinary, ['-r', php], {
      input: JSON.stringify({ email }),
      encoding: 'utf8',
      timeout: 5000,
      env: process.env,
    });

    if (result.status !== 0 || !result.stdout.trim()) {
      return undefined;
    }

    try {
      const row = JSON.parse(result.stdout) as Partial<Record<string, string>> | null;
      if (!row?.id || !row.email || !row.password_hash || !row.name || !isRole(row.role)) {
        return undefined;
      }

      return {
        id: row.id,
        email: row.email,
        name: row.name,
        role: row.role,
        passwordHash: row.password_hash,
        createdAt: row.created_at,
      };
    } catch {
      return undefined;
    }
  }

  private verifyPassword(password: string, hash: string): boolean {
    if (hash.startsWith('$2y$') || hash.startsWith('$2a$') || hash.startsWith('$2b$') || hash.startsWith('$argon2')) {
      return this.verifyPhpPassword(password, hash);
    }

    return safeEqual(password, hash);
  }

  private verifyPhpPassword(password: string, hash: string): boolean {
    const phpBinary = process.env.VCMS_PHP_BINARY ?? 'php';
    const php = String.raw`
$input = json_decode(stream_get_contents(STDIN), true);
if (!is_array($input) || !array_key_exists('password', $input) || !array_key_exists('hash', $input)) { exit(2); }
echo password_verify($input['password'], $input['hash']) ? '1' : '0';
`;
    const result = spawnSync(phpBinary, ['-r', php], {
      input: JSON.stringify({ password, hash }),
      encoding: 'utf8',
      timeout: 5000,
      env: process.env,
    });

    return result.status === 0 && result.stdout.trim() === '1';
  }

  private signToken(payload: TokenPayload): string {
    const header = base64UrlEncode(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
    const body = base64UrlEncode(JSON.stringify(payload));
    const signature = this.sign(`${header}.${body}`);
    return `${header}.${body}.${signature}`;
  }

  private verifyToken(token: string): TokenPayload {
    const [header, body, signature] = token.split('.');
    if (!header || !body || !signature || !safeEqual(signature, this.sign(`${header}.${body}`))) {
      throw new UnauthorizedException('Invalid bearer token');
    }

    try {
      const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8')) as TokenPayload;
      if (!payload.sub || !payload.email || !payload.name || !isRole(payload.role) || payload.exp < Math.floor(Date.now() / 1000)) {
        throw new UnauthorizedException('Expired bearer token');
      }

      return payload;
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }

      throw new UnauthorizedException('Invalid bearer token');
    }
  }

  private sign(value: string): string {
    return createHmac('sha256', this.secret).update(value).digest('base64url');
  }

  private readBearerToken(request: Request): string | undefined {
    const authorization = request.headers.authorization;
    if (!authorization?.startsWith('Bearer ')) {
      return undefined;
    }

    return authorization.slice('Bearer '.length).trim();
  }

  private toProfile(user: StoredAuthUser): AuthenticatedUserProfile {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      createdAt: user.createdAt,
      permissions: ROLE_PERMISSIONS[user.role],
    };
  }
}

function base64UrlEncode(value: string): string {
  return Buffer.from(value).toString('base64url');
}

function safeEqual(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }

  return timingSafeEqual(leftBuffer, rightBuffer);
}

function isRole(value: unknown): value is Role {
  return value === 'admin' || value === 'editor' || value === 'author' || value === 'guest';
}
