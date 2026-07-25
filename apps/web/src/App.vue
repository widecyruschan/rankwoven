<script setup lang="ts">
import { computed, ref } from 'vue';
import { RouterLink, RouterView, useRoute } from 'vue-router';

const route = useRoute();
const isNavigationOpen = ref(false);

const currentTitle = computed(() => String(route.meta.title ?? 'AIEO'));

function toggleNavigation() {
  isNavigationOpen.value = !isNavigationOpen.value;
}
</script>

<template>
  <div class="app-shell">
    <aside class="sidebar" :class="{ 'sidebar-open': isNavigationOpen }">
      <div class="brand">
        <span class="brand-mark">A</span>
        <div>
          <strong>AIEO</strong>
          <small>AI SEO 平台</small>
        </div>
      </div>

      <nav class="nav-list" aria-label="主導覽">
        <RouterLink to="/">站點概覽</RouterLink>
        <RouterLink to="/sites">站點管理</RouterLink>
        <RouterLink to="/cms-adapters">CMS 適配器</RouterLink>
        <RouterLink to="/settings">設定</RouterLink>
      </nav>
    </aside>

    <main class="main-panel">
      <header class="topbar">
        <button class="menu-button" type="button" @click="toggleNavigation">選單</button>
        <div>
          <p>第 1 階段</p>
          <h1>{{ currentTitle }}</h1>
        </div>
      </header>

      <RouterView />
    </main>
  </div>
</template>
