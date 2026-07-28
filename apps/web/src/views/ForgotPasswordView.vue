<script setup lang="ts">
import { ref } from 'vue';
import { Input, Button, Card, Typography, Form, message } from 'ant-design-vue';
import { useI18n } from 'vue-i18n';
import { forgotPassword } from '../api/auth';

const { t } = useI18n();

const email = ref('');
const loading = ref(false);
const sent = ref(false);

function tc(key: string) {
  return t(`forgotPassword.${key}`);
}

async function handleSubmit() {
  loading.value = true;
  try {
    await forgotPassword(email.value.trim().toLowerCase());
    sent.value = true;
    message.success(tc('success'));
  } catch (e: unknown) {
    message.error(e instanceof Error ? e.message : '請稍後再試');
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
        <Typography.Paragraph type="secondary" class="auth-subtitle">
          <template v-if="!sent">{{ tc('body') }}</template>
          <template v-else>{{ tc('success') }}</template>
        </Typography.Paragraph>
        <Form v-if="!sent" layout="vertical" @finish="handleSubmit">
          <Form.Item>
            <Input
              v-model:value="email"
              :placeholder="tc('email')"
              type="email"
              size="large"
              autocomplete="email"
            />
          </Form.Item>
          <Form.Item>
            <Button type="primary" html-type="submit" :loading="loading" block size="large">
              {{ loading ? tc('submitting') : tc('submit') }}
            </Button>
          </Form.Item>
        </Form>
        <div class="auth-links">
          <router-link to="/login">{{ tc('backToLogin') }}</router-link>
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
