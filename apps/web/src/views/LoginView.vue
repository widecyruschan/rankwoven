<script setup lang="ts">
import { ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { useAuthStore } from '../stores/auth';

const { t } = useI18n();
const route = useRoute();
const router = useRouter();
const authStore = useAuthStore();

const email = ref('demo@rankwoven.com');
const password = ref('rankwoven');
const isSubmitting = ref(false);
const loginError = ref('');

async function submitLogin() {
  loginError.value = '';
  isSubmitting.value = true;

  try {
    await authStore.login(email.value, password.value);
    const redirect = typeof route.query.redirect === 'string' ? route.query.redirect : '/app';
    await router.push(redirect);
  } catch (error) {
    loginError.value = error instanceof Error ? error.message : t('login.failed');
  } finally {
    isSubmitting.value = false;
  }
}
</script>

<template>
  <main class="login-page">
    <section class="login-panel">
      <div>
        <p class="eyebrow">{{ t('login.eyebrow') }}</p>
        <h1>{{ t('login.title') }}</h1>
        <p>{{ t('login.body') }}</p>
      </div>

      <form class="login-form" @submit.prevent="submitLogin">
        <label>
          <span>{{ t('login.email') }}</span>
          <input v-model="email" type="email" autocomplete="email" required>
        </label>
        <label>
          <span>{{ t('login.password') }}</span>
          <input v-model="password" type="password" autocomplete="current-password" required>
        </label>
        <button class="primary-button" type="submit" :disabled="isSubmitting">
          {{ isSubmitting ? t('login.submitting') : t('login.submit') }}
        </button>
        <p v-if="loginError" class="form-message form-message-error">{{ loginError }}</p>
      </form>
    </section>
  </main>
</template>
