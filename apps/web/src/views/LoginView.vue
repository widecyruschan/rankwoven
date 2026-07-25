<script setup lang="ts">
import { computed } from 'vue';
import { RouterLink } from 'vue-router';
import { useI18n } from 'vue-i18n';

const { t } = useI18n();

const demoLinks = computed(() => [
  { to: '/app', label: t('login.customerEntry') },
  { to: '/admin', label: t('login.adminEntry') }
]);
</script>

<template>
  <main class="login-page">
    <section class="login-panel">
      <div>
        <p class="eyebrow">{{ t('login.eyebrow') }}</p>
        <h1>{{ t('login.title') }}</h1>
        <p>{{ t('login.body') }}</p>
      </div>

      <form class="login-form">
        <label>
          <span>{{ t('login.email') }}</span>
          <input type="email" value="demo@rankwoven.com">
        </label>
        <label>
          <span>{{ t('login.password') }}</span>
          <input type="password" value="rankwoven">
        </label>
        <button class="primary-button" type="button">{{ t('login.submit') }}</button>
      </form>

      <div class="demo-entry-list">
        <RouterLink v-for="link in demoLinks" :key="link.to" class="text-button" :to="link.to">
          {{ link.label }}
        </RouterLink>
      </div>
    </section>
  </main>
</template>
