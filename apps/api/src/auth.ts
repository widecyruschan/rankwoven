import { createHmac, timingSafeEqual } from 'node:crypto';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { Pool, type QueryResultRow } from 'pg';
import { z } from 'zod';

const loginSchema = z.object({
  email: z.email(),
  password: z.string().min(1).max(200)
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

export interface AuthRepository {
  login(email: string, password: string): Promise<AuthUser | undefined>;
  findUser(userId: string): Promise<AuthUser | undefined>;
  close?(): Promise<void>;
}

export interface AuthService {
  login(email: string, password: string): Promise<AuthSession | undefined>;
  verifyToken(token: string): Promise<AuthUser | undefined>;
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

function readTokenSubject(token: string) {
  const [header, payload, signature] = token.split('.');
  if (!header || !payload || !signature) {
    return undefined;
  }

  const unsignedToken = `${header}.${payload}`;
  const expectedSignature = signPayload(unsignedToken);
  if (!isSameHash(signature, expectedSignature)) {
    return undefined;
  }

  let parsed: {
    sub?: unknown;
    exp?: unknown;
  };

  try {
    parsed = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as {
      sub?: unknown;
      exp?: unknown;
    };
  } catch {
    return undefined;
  }

  if (typeof parsed.sub !== 'string' || typeof parsed.exp !== 'number') {
    return undefined;
  }

  if (parsed.exp < Math.floor(Date.now() / 1000)) {
    return undefined;
  }

  return parsed.sub;
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

  return {
    async login(email, password) {
      if (email.toLowerCase() !== user.email || !isSameHash(hashPassword(password), user.passwordHash)) {
        return undefined;
      }

      return user;
    },
    async findUser(userId) {
      return userId === user.id ? user : undefined;
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
}
