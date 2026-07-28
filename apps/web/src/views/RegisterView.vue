<script setup lang="ts">
import { ref, reactive } from 'vue';
import { useRouter } from 'vue-router';
import { Form, Input, Button, Card, Typography, message } from 'ant-design-vue';
import { useI18n } from 'vue-i18n';
import { registerUser } from '../api/auth';
import { useAuthStore } from '../stores/auth';

const { t } = useI18n();
const router = useRouter();
const authStore = useAuthStore();

const loading = ref(false);
const formState = reactive({
  name: '',
  email: '',
  password: '',
  confirmPassword: ''
});

function tc(key: string) {
  return t(`register.${key}`);
}

async function handleRegister() {
  if (!formState.name.trim()) {
    message.warning(tc('nameRequired'));
    return;
  }
  if (formState.password !== formState.confirmPassword) {
    message.warning(tc('passwordMismatch'));
    return;
  }
  if (formState.password.length < 8) {
    message.error('密碼至少需要 8 個字元');
    return;
  }

  loading.value = true;
  try {
    const session = await registerUser(formState.name.trim(), formState.email.trim().toLowerCase(), formState.password);
    authStore.setSession(session.token, session.user);
    message.success(t('login.successRegistered'));
    await router.push('/app/dashboard');
  } catch (e: unknown) {
    message.error((e instanceof Error ? e.message : undefined) || tc('failed'));
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <div class="auth-page">
    <div class="auth-illustration">
      <div class="brand-logo">RW</div>
      <h1>RankWoven</h1>
      <p>AI-Powered SEO Optimization Platform</p>
    </div>
    <div class="auth-card">
      <Card :bordered="false">
        <Typography.Title :level="3" class="auth-title">{{ tc('title') }}</Typography.Title>
        <Typography.Paragraph type="secondary" class="auth-subtitle">{{ tc('body') }}</Typography.Paragraph>
        <Form layout="vertical" @finish="handleRegister">
          <Form.Item>
            <Input
              v-model:value="formState.name"
              :placeholder="tc('name')"
              size="large"
              autocomplete="name"
            />
          </Form.Item>
          <Form.Item>
            <Input
              v-model:value="formState.email"
              :placeholder="tc('email')"
              type="email"
              size="large"
              autocomplete="email"
            />
          </Form.Item>
          <Form.Item>
            <Input.Password
              v-model:value="formState.password"
              :placeholder="tc('password')"
              size="large"
              autocomplete="new-password"
            />
          </Form.Item>
          <Form.Item>
            <Input.Password
              v-model:value="formState.confirmPassword"
              :placeholder="tc('confirmPassword')"
              size="large"
              autocomplete="new-password"
            />
          </Form.Item>
          <Form.Item>
            <Button type="primary" html-type="submit" :loading="loading" block size="large">
              {{ loading ? tc('submitting') : tc('submit') }}
            </Button>
          </Form.Item>
        </Form>
        <div class="auth-links">
          <router-link to="/login">{{ tc('loginLink') }}</router-link>
        </div>
      </Card>
    </div>
  </div>
</template>

<style scoped>
.auth-page {
  display: flex;
  min-height: 100vh;
  align-items: center;
  justify-content: center;
  padding: 24px;
  gap: 48px;
  flex-wrap: wrap;
}

.auth-illustration {
  max-width: 380px;
  text-align: center;
}

.auth-illustration h1 {
  font-size: 28px;
  margin: 12px 0 8px;
  color: var(--color-brand-primary);
}

.auth-illustration p {
  color: var(--color-muted);
  font-size: 15px;
}

.brand-logo {
  width: 64px;
  height: 64px;
  border-radius: 16px;
  background: var(--color-brand-primary);
  color: #fff;
  font-size: 22px;
  font-weight: 800;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.auth-card {
  width: 100%;
  max-width: 420px;
}

.auth-title {
  text-align: center;
  margin-bottom: 4px;
}

.auth-subtitle {
  text-align: center;
  margin-bottom: 24px;
}

.auth-links {
  text-align: center;
}

.auth-links a {
  color: var(--color-brand-primary);
  font-weight: 500;
}

@media (max-width: 768px) {
  .auth-illustration {
    display: none;
  }
}
</style>
