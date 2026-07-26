import { computed, ref } from 'vue';
import { defineStore } from 'pinia';
import { getMe, login as loginApi, type AuthUser } from '../api/auth';

const authStorageKey = 'rankwoven_auth_session';

interface StoredSession {
  token: string;
  user: AuthUser;
}

function readStoredSession(): StoredSession | undefined {
  const rawValue = localStorage.getItem(authStorageKey);
  if (!rawValue) {
    return undefined;
  }

  try {
    return JSON.parse(rawValue) as StoredSession;
  } catch {
    localStorage.removeItem(authStorageKey);
    return undefined;
  }
}

export const useAuthStore = defineStore('auth', () => {
  const storedSession = readStoredSession();
  const token = ref(storedSession?.token ?? '');
  const user = ref<AuthUser | null>(storedSession?.user ?? null);

  const isLoggedIn = computed(() => Boolean(token.value));

  function setSession(nextToken: string, nextUser: AuthUser) {
    token.value = nextToken;
    user.value = nextUser;
    localStorage.setItem(
      authStorageKey,
      JSON.stringify({
        token: nextToken,
        user: nextUser
      })
    );
  }

  async function login(email: string, password: string) {
    const session = await loginApi(email, password);
    setSession(session.token, session.user);
    return session;
  }

  async function restoreSession() {
    if (!token.value) {
      return false;
    }

    try {
      const result = await getMe(token.value);
      setSession(token.value, result.user);
      return true;
    } catch {
      logout();
      return false;
    }
  }

  function logout() {
    token.value = '';
    user.value = null;
    localStorage.removeItem(authStorageKey);
  }

  return {
    token,
    user,
    isLoggedIn,
    setSession,
    login,
    restoreSession,
    logout
  };
});
