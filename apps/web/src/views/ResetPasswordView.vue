<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { Input, Button, Card, Typography, Form, message } from 'ant-design-vue';
import { useI18n } from 'vue-i18n';
import { resetPassword } from '../api/auth';

const { t } = useI18n();
const router = useRouter();
const route = useRoute();

const loading = ref(false);
const success = ref(false);
const invalidToken = ref(false);

const formState = reactive({
  newPassword: '',
  confirmPassword: ''
});

const token = (route.query.token as string) ?? '';

function tc(key: string) {
  return t(`resetPassword.${key}`);
}

onMounted(() => {
  if (!token) {
    invalidToken.value = true;
  }
});

async function handleSubmit() {
  if (formState.newPassword !== formState.confirmPassword) {
    message.warning(tc('passwordMismatch'));
    return;
  }
  if (formState.newPassword.length < 8) {
    message.error('密碼至少需要 8 個字元');
    return;
  }

  loading.value = true;
  try {
    await resetPassword(token, formState.newPassword);
    success.value = true;
    message.success(tc('success'));
    setTimeout(() => {
      router.push('/login');
    }, 2000);
  } catch (e: unknown) {
    message.error(e instanceof Error ? e.message : tc('invalidToken'));
    invalidToken.value = true;
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
        <template v-if="invalidToken && !success">
          <Typography.Title :level="3" class="auth-title">{{ tc('title') }}</Typography.Title>
          <Typography.Paragraph type="danger" class="auth-subtitle">
            {{ tc('invalidToken') }}
          </Typography.Paragraph>
          <div class="auth-links">
            <router-link to="/forgot-password">{{ tc('backToLogin') }}</router-link>
          </div>
        </template>
        <template v-else>
          <Typography.Title :level="3" class="auth-title">{{ tc('title') }}</Typography.Title>
          <Typography.Paragraph type="secondary" class="auth-subtitle">
            <template v-if="!success">{{ tc('body') }}</template>
            <template v-else>{{ tc('success') }}</template>
          </Typography.Paragraph>
          <Form v-if="!success" layout="vertical" @finish="handleSubmit">
            <Form.Item>
              <Input.Password
                v-model:value="formState.newPassword"
                :placeholder="tc('newPassword')"
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
        </template>
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
