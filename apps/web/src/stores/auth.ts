import { computed, ref } from 'vue';
import { defineStore } from 'pinia';

interface UserProfile {
  id: string;
  name: string;
  email: string;
}

export const useAuthStore = defineStore('auth', () => {
  const token = ref('');
  const user = ref<UserProfile | null>(null);

  const isLoggedIn = computed(() => Boolean(token.value));

  function setSession(nextToken: string, nextUser: UserProfile) {
    token.value = nextToken;
    user.value = nextUser;
  }

  function logout() {
    token.value = '';
    user.value = null;
  }

  return {
    token,
    user,
    isLoggedIn,
    setSession,
    logout
  };
});
