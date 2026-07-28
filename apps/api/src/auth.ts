import { createHmac, randomUUID, timingSafeEqual } from 'node:crypto';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { Pool, type QueryResultRow } from 'pg';
import { z } from 'zod';

const loginSchema = z.object({
  email: z.email(),
  password: z.string().min(1).max(200)
});

const registerSchema = z.object({
  name: z.string().min(1).max(160),
  email: z.email(),
  password: z.string().min(8).max(200)
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1).max(200),
  newPassword: z.string().min(8).max(200)
});

const forgotPasswordSchema = z.object({
  email: z.email()
});

const resetPasswordSchema = z.object({
  token: z.string().min(1),
  newPassword: z.string().min(8).max(200)
});

export interface AuthUser {
  id: string;
  workspaceId: string;
  name: string;
  email: string;
  role: 'owner' | 'admin' | 'editor' | 'viewer';
}

export interface AuthSession {
  user: AuthUser;
  token: string;
}

export interface RegisterResult {
  user: AuthUser;
  token: string;
}

export interface AuthRepository {
  login(email: string, password: string): Promise<AuthUser | undefined>;
  findUser(userId: string): Promise<AuthUser | undefined>;
  findUserByEmail(email: string): Promise<AuthUser | undefined>;
  register(name: string, email: string, password: string): Promise<RegisterResult>;
  changePassword(userId: string, currentPassword: string, newPassword: string): Promise<boolean>;
  storeResetToken(email: string, token: string): Promise<boolean>;
  resetPassword(token: string, newPassword: string): Promise<boolean>;
  close?(): Promise<void>;
}

export interface AuthService {
  login(email: string, password: string): Promise<AuthSession | undefined>;
  verifyToken(token: string): Promise<AuthUser | undefined>;
  register(name: string, email: string, password: string): Promise<AuthSession>;
  changePassword(userId: string, currentPassword: string, newPassword: string): Promise<void>;
}

const defaultWorkspaceId = '00000000-0000-4000-8000-000000000001';
const defaultUserId = '00000000-0000-4000-8000-000000000101';
const defaultUserEmail = 'demo@rankwoven.com';
const defaultUserPassword = 'rankwoven';

const authMigrationSql = `
CREATE TABLE IF NOT EXISTS workspaces (
  id uuid PRIMARY KEY,
  name varchar(160) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY,
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  name varchar(160) NOT NULL,
  email varchar(240) NOT NULL UNIQUE,
  password_hash text NOT NULL,
  role text NOT NULL CHECK (role IN ('owner', 'admin', 'editor', 'viewer')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS workspace_members (
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('owner', 'admin', 'editor', 'viewer')),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (workspace_id, user_id)
);

ALTER TABLE users ADD COLUMN IF NOT EXISTS password_reset_token text;
ALTER TABLE users ADD COLUMN IF NOT EXISTS password_reset_expires_at timestamptz;
`;

function getJwtSecret() {
  return process.env.JWT_SECRET ?? 'rankwoven-local-jwt-secret';
}

function toBase64Url(value: Buffer | string) {
  return Buffer.from(value).toString('base64url');
}

function signPayload(value: string) {
  return createHmac('sha256', getJwtSecret()).update(value).digest('base64url');
}

function hashPassword(password: string) {
  return createHmac('sha256', getJwtSecret()).update(password).digest('hex');
}

function isSameHash(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
}

function createToken(user: AuthUser) {
  const header = toBase64Url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const payload = toBase64Url(
    JSON.stringify({
      sub: user.id,
      wid: user.workspaceId,
      role: user.role,
      exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7
    })
  );
  const unsignedToken = `${header}.${payload}`;

  return `${unsignedToken}.${signPayload(unsignedToken)}`;
}

function createResetToken(email: string) {
  const header = toBase64Url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const payload = toBase64Url(
    JSON.stringify({
      email,
      purpose: 'password_reset',
      exp: Math.floor(Date.now() / 1000) + 60 * 60
    })
  );
  const unsignedToken = `${header}.${payload}`;
  return `${unsignedToken}.${signPayload(unsignedToken)}`;
}

function readTokenSubject(token: string) {
  return readTokenField(token, 'sub', (p) => {
    if (typeof p.sub !== 'string' || typeof p.exp !== 'number') return undefined;
    return p.sub;
  });
}

function readTokenField<T>(
  token: string,
  _field: string,
  extract: (parsed: Record<string, unknown>) => T | undefined
): T | undefined {
  const [header, payload, signature] = token.split('.');
  if (!header || !payload || !signature) {
    return undefined;
  }

  const unsignedToken = `${header}.${payload}`;
  const expectedSignature = signPayload(unsignedToken);
  if (!isSameHash(signature, expectedSignature)) {
    return undefined;
  }

  let parsed: Record<string, unknown>;

  try {
    parsed = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as Record<string, unknown>;
  } catch {
    return undefined;
  }

  if (typeof parsed.exp === 'number' && parsed.exp < Math.floor(Date.now() / 1000)) {
    return undefined;
  }

  return extract(parsed);
}

function mapUserRow(row: QueryResultRow): AuthUser {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    name: row.name,
    email: row.email,
    role: row.role
  };
}

export function createAuthService(repository: AuthRepository): AuthService {
  return {
    async login(email, password) {
      const user = await repository.login(email, password);

      if (!user) {
        return undefined;
      }

      return {
        user,
        token: createToken(user)
      };
    },
    async verifyToken(token) {
      const userId = readTokenSubject(token);

      if (!userId) {
        return undefined;
      }

      return repository.findUser(userId);
    },
    async register(name, email, password) {
      const result = await repository.register(name, email, password);
      // Re-issue a proper auth token (7-day) from the register result
      return {
        user: result.user,
        token: createToken(result.user)
      };
    },
    async changePassword(userId, currentPassword, newPassword) {
      const success = await repository.changePassword(userId, currentPassword, newPassword);
      if (!success) {
        throw new Error('密碼變更失敗，請確認目前密碼正確');
      }
    }
  };
}

export function createInMemoryAuthRepository(): AuthRepository {
  const user: AuthUser & { passwordHash: string } = {
    id: defaultUserId,
    workspaceId: defaultWorkspaceId,
    name: 'RankWoven Owner',
    email: defaultUserEmail,
    role: 'owner',
    passwordHash: hashPassword(defaultUserPassword)
  };
  const users = new Map<string, AuthUser & { passwordHash: string }>();
  users.set(user.email, user);
  const resetTokens = new Map<string, { email: string; expiresAt: number }>();

  return {
    async login(email, password) {
      const u = users.get(email.toLowerCase());
      if (!u || !isSameHash(hashPassword(password), u.passwordHash)) {
        return undefined;
      }
      return u;
    },
    async findUser(userId) {
      for (const u of users.values()) {
        if (u.id === userId) return u;
      }
      return undefined;
    },
    async findUserByEmail(email) {
      return users.get(email.toLowerCase());
    },
    async register(name, email, password) {
      const existing = users.get(email.toLowerCase());
      if (existing) {
        throw new Error('此電郵已註冊', { cause: existing });
      }
      const newUser: AuthUser & { passwordHash: string } = {
        id: `user-${Date.now()}`,
        workspaceId: `ws-${Date.now()}`,
        name,
        email: email.toLowerCase(),
        role: 'editor',
        passwordHash: hashPassword(password)
      };
      users.set(newUser.email, newUser);
      return { user: newUser, token: createToken(newUser) };
    },
    async changePassword(userId, currentPassword, newPassword) {
      for (const u of users.values()) {
        if (u.id === userId) {
          if (!isSameHash(hashPassword(currentPassword), u.passwordHash)) {
            return false;
          }
          u.passwordHash = hashPassword(newPassword);
          return true;
        }
      }
      return false;
    },
    async storeResetToken(email, token) {
      const u = users.get(email.toLowerCase());
      if (!u) return false; // Don't leak user existence
      resetTokens.set(token, { email, expiresAt: Date.now() + 60 * 60 * 1000 });
      return true;
    },
    async resetPassword(token, newPassword) {
      const entry = resetTokens.get(token);
      if (!entry || entry.expiresAt < Date.now()) return false;
      const u = users.get(entry.email);
      if (!u) return false;
      u.passwordHash = hashPassword(newPassword);
      resetTokens.delete(token);
      return true;
    }
  };
}

export class PostgresAuthRepository implements AuthRepository {
  private readonly pool: Pool;
  private migrationPromise?: Promise<void>;

  constructor(databaseUrl: string) {
    this.pool = new Pool({
      connectionString: databaseUrl
    });
  }

  async login(email: string, password: string) {
    await this.ensureSchema();

    const result = await this.pool.query(
      `
        SELECT *
        FROM users
        WHERE email = $1
        LIMIT 1
      `,
      [email.toLowerCase()]
    );
    const row = result.rows[0];

    if (!row || !isSameHash(hashPassword(password), row.password_hash)) {
      return undefined;
    }

    return mapUserRow(row);
  }

  async findUser(userId: string) {
    await this.ensureSchema();

    const result = await this.pool.query(
      `
        SELECT *
        FROM users
        WHERE id = $1
        LIMIT 1
      `,
      [userId]
    );

    return result.rows[0] ? mapUserRow(result.rows[0]) : undefined;
  }

  async findUserByEmail(email: string) {
    await this.ensureSchema();

    const result = await this.pool.query(
      `
        SELECT *
        FROM users
        WHERE email = $1
        LIMIT 1
      `,
      [email.toLowerCase()]
    );

    return result.rows[0] ? mapUserRow(result.rows[0]) : undefined;
  }

  async register(name: string, email: string, password: string) {
    await this.ensureSchema();

    const workspaceId = randomUUID();
    const userId = randomUUID();

    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(
        `INSERT INTO workspaces (id, name) VALUES ($1, $2) ON CONFLICT (id) DO NOTHING`,
        [workspaceId, `${name}'s Workspace`]
      );
      await client.query(
        `INSERT INTO users (id, workspace_id, name, email, password_hash, role) VALUES ($1, $2, $3, $4, $5, 'editor')`,
        [userId, workspaceId, name, email.toLowerCase(), hashPassword(password)]
      );
      await client.query(
        `INSERT INTO workspace_members (workspace_id, user_id, role) VALUES ($1, $2, 'owner')`,
        [workspaceId, userId]
      );
      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      // Check for duplicate email
      if (err instanceof Error && err.message.includes('users_email_key')) {
        throw new Error('此電郵已註冊', { cause: err });
      }
      throw err instanceof Error ? new Error(err.message, { cause: err }) : err;
    } finally {
      client.release();
    }

    const user: AuthUser = { id: userId, workspaceId, name, email, role: 'editor' };
    return { user, token: createToken(user) };
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string) {
    await this.ensureSchema();

    const userResult = await this.pool.query(
      `SELECT password_hash FROM users WHERE id = $1 LIMIT 1`,
      [userId]
    );
    const row = userResult.rows[0];
    if (!row || !isSameHash(hashPassword(currentPassword), row.password_hash)) {
      return false;
    }

    await this.pool.query(
      `UPDATE users SET password_hash = $1 WHERE id = $2`,
      [hashPassword(newPassword), userId]
    );
    return true;
  }

  async storeResetToken(email: string, token: string) {
    await this.ensureSchema();

    const result = await this.pool.query(
      `UPDATE users SET password_reset_token = $1, password_reset_expires_at = NOW() + INTERVAL '1 hour' WHERE email = $2`,
      [token, email.toLowerCase()]
    );
    return (result.rowCount ?? 0) > 0;
  }

  async resetPassword(token: string, newPassword: string) {
    await this.ensureSchema();

    const result = await this.pool.query(
      `UPDATE users SET password_hash = $1, password_reset_token = NULL, password_reset_expires_at = NULL WHERE password_reset_token = $2 AND password_reset_expires_at > NOW()`,
      [hashPassword(newPassword), token]
    );
    return (result.rowCount ?? 0) > 0;
  }

  async close() {
    await this.pool.end();
  }

  private async ensureSchema() {
    if (process.env.NODE_ENV === 'production') {
      return;
    }
    this.migrationPromise ??= this.pool
      .query(authMigrationSql)
      .then(() =>
        this.pool.query(
          `
            INSERT INTO workspaces (id, name)
            VALUES ($1, 'RankWoven Demo Workspace')
            ON CONFLICT (id) DO NOTHING
          `,
          [defaultWorkspaceId]
        )
      )
      .then(() =>
        this.pool.query(
          `
            INSERT INTO users (id, workspace_id, name, email, password_hash, role)
            VALUES ($1, $2, 'RankWoven Owner', $3, $4, 'owner')
            ON CONFLICT (email) DO NOTHING
          `,
          [defaultUserId, defaultWorkspaceId, defaultUserEmail, hashPassword(defaultUserPassword)]
        )
      )
      .then(() =>
        this.pool.query(
          `
            INSERT INTO workspace_members (workspace_id, user_id, role)
            VALUES ($1, $2, 'owner')
            ON CONFLICT (workspace_id, user_id) DO NOTHING
          `,
          [defaultWorkspaceId, defaultUserId]
        )
      )
      .then(() => undefined);

    await this.migrationPromise;
  }
}

export function createDefaultAuthRepository(databaseUrl?: string): AuthRepository {
  return databaseUrl ? new PostgresAuthRepository(databaseUrl) : createInMemoryAuthRepository();
}

export function getBearerToken(request: FastifyRequest) {
  const authorization = request.headers.authorization;

  if (!authorization?.startsWith('Bearer ')) {
    return '';
  }

  return authorization.slice('Bearer '.length).trim();
}

export async function requireAuth(
  authService: AuthService,
  request: FastifyRequest,
  reply: FastifyReply
) {
  const user = await authService.verifyToken(getBearerToken(request));

  if (!user) {
    reply.status(401).send({
      success: false,
      message: '請先登入',
      error: {
        code: 'AUTH_TOKEN_INVALID'
      }
    });
    return undefined;
  }

  return user;
}

export function registerAuthRoutes(
  app: FastifyInstance,
  authService: AuthService,
  repository: AuthRepository
) {
  app.addHook('onClose', async () => {
    await repository.close?.();
  });

  app.post('/api/v1/auth/login', async (request, reply) => {
    const parsed = loginSchema.safeParse(request.body);

    if (!parsed.success) {
      return reply.status(400).send({
        success: false,
        message: '請求資料格式不正確',
        error: {
          code: 'VALIDATION_ERROR',
          details: parsed.error.issues
        }
      });
    }

    const session = await authService.login(parsed.data.email, parsed.data.password);

    if (!session) {
      return reply.status(401).send({
        success: false,
        message: '登入資料不正確',
        error: {
          code: 'AUTH_LOGIN_FAILED'
        }
      });
    }

    return {
      success: true,
      message: '登入成功',
      data: session
    };
  });

  app.get('/api/v1/auth/me', async (request, reply) => {
    const user = await requireAuth(authService, request, reply);

    if (!user) {
      return reply;
    }

    return {
      success: true,
      message: '操作成功',
      data: {
        user
      }
    };
  });

  // ── Register ──
  app.post('/api/v1/auth/register', async (request, reply) => {
    const parsed = registerSchema.safeParse(request.body);

    if (!parsed.success) {
      return reply.status(400).send({
        success: false,
        message: '請求資料格式不正確',
        error: {
          code: 'VALIDATION_ERROR',
          details: parsed.error.issues
        }
      });
    }

    try {
      const session = await authService.register(parsed.data.name, parsed.data.email, parsed.data.password);
      return reply.status(201).send({
        success: true,
        message: '註冊成功',
        data: session
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : '註冊失敗';
      const code = message.includes('已註冊') ? 'AUTH_EMAIL_DUPLICATE' : 'AUTH_REGISTER_FAILED';
      return reply.status(code === 'AUTH_EMAIL_DUPLICATE' ? 409 : 500).send({
        success: false,
        message,
        error: { code }
      });
    }
  });

  // ── Change Password ──
  app.post('/api/v1/auth/change-password', async (request, reply) => {
    const user = await requireAuth(authService, request, reply);
    if (!user) return reply;

    const parsed = changePasswordSchema.safeParse(request.body);

    if (!parsed.success) {
      return reply.status(400).send({
        success: false,
        message: '請求資料格式不正確',
        error: {
          code: 'VALIDATION_ERROR',
          details: parsed.error.issues
        }
      });
    }

    try {
      await authService.changePassword(user.id, parsed.data.currentPassword, parsed.data.newPassword);
      return {
        success: true,
        message: '密碼已更新'
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : '密碼變更失敗';
      return reply.status(400).send({
        success: false,
        message,
        error: { code: 'AUTH_PASSWORD_CHANGE_FAILED' }
      });
    }
  });

  // ── Forgot Password ──
  app.post('/api/v1/auth/forgot-password', async (request, reply) => {
    const parsed = forgotPasswordSchema.safeParse(request.body);

    if (!parsed.success) {
      return reply.status(400).send({
        success: false,
        message: '請求資料格式不正確',
        error: {
          code: 'VALIDATION_ERROR',
          details: parsed.error.issues
        }
      });
    }

    const resetToken = createResetToken(parsed.data.email);
    await repository.storeResetToken(parsed.data.email, resetToken);

    // In production: send email with reset link
    // In MVP: return token in response (dev convenience)
    const resetUrl = `https://rankwoven.com/reset-password?token=${resetToken}`;

    // Log instead of sending email for MVP
    console.log(`[auth] Password reset link: ${resetUrl}`);

    return {
      success: true,
      message: '如果此電郵已註冊，密碼重設郵件已發送',
      // Remove token from response in production
      ...(process.env.NODE_ENV !== 'production' ? { _devResetToken: resetToken, _devResetUrl: resetUrl } : {})
    };
  });

  // ── Reset Password ──
  app.post('/api/v1/auth/reset-password', async (request, reply) => {
    const parsed = resetPasswordSchema.safeParse(request.body);

    if (!parsed.success) {
      return reply.status(400).send({
        success: false,
        message: '請求資料格式不正確',
        error: {
          code: 'VALIDATION_ERROR',
          details: parsed.error.issues
        }
      });
    }

    const success = await repository.resetPassword(parsed.data.token, parsed.data.newPassword);

    if (!success) {
      return reply.status(400).send({
        success: false,
        message: '重設連結已失效或無效，請重新申請',
        error: { code: 'AUTH_RESET_TOKEN_INVALID' }
      });
    }

    return {
      success: true,
      message: '密碼已重設，請使用新密碼登入'
    };
  });
}
