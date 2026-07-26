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

interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3011';

async function requestApi<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    ...init,
    headers: {
      ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
      ...init?.headers
    }
  });
  const body = (await response.json()) as ApiResponse<T>;

  if (!response.ok || !body.success) {
    throw new Error(body.message || 'API request failed');
  }

  return body.data;
}

export async function login(email: string, password: string) {
  return requestApi<AuthSession>('/api/v1/auth/login', {
    method: 'POST',
    body: JSON.stringify({
      email,
      password
    })
  });
}

export async function getMe(token: string) {
  return requestApi<{
    user: AuthUser;
  }>('/api/v1/auth/me', {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });
}
