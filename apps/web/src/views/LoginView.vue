<script setup lang="ts">
import { reactive, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { useAuthStore } from '../stores/auth';

const { t } = useI18n();
const route = useRoute();
const router = useRouter();
const authStore = useAuthStore();

const formState = reactive({
  email: 'demo@rankwoven.com',
  password: 'rankwoven'
});
const isSubmitting = ref(false);
const loginError = ref('');

function getSafeRedirect() {
  const redirect = typeof route.query.redirect === 'string' ? route.query.redirect : '';
  return redirect.startsWith('/') && !redirect.startsWith('//') ? redirect : '/app';
}

async function submitLogin() {
  loginError.value = '';
  isSubmitting.value = true;

  try {
    await authStore.login(formState.email, formState.password);
    await router.push(getSafeRedirect());
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

      <a-form class="login-form" layout="vertical" :model="formState" @finish="submitLogin">
        <a-form-item
          name="email"
          :label="t('login.email')"
          :rules="[{ required: true, type: 'email', message: t('login.emailRequired') }]"
        >
          <a-input v-model:value="formState.email" autocomplete="email" />
        </a-form-item>
        <a-form-item
          name="password"
          :label="t('login.password')"
          :rules="[{ required: true, message: t('login.passwordRequired') }]"
        >
          <a-input-password v-model:value="formState.password" autocomplete="current-password" />
        </a-form-item>
        <a-button block type="primary" html-type="submit" :loading="isSubmitting">
          {{ isSubmitting ? t('login.submitting') : t('login.submit') }}
        </a-button>
        <a-alert v-if="loginError" type="error" show-icon :message="loginError" />
      </a-form>
    </section>
  </main>
</template>
