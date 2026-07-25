<script setup lang="ts">
const metrics = [
  { label: '已連接站點', value: '0' },
  { label: '待審核建議', value: '0' },
  { label: '執行中任務', value: '0' }
];
</script>

<template>
  <section class="page-section">
    <div class="summary-grid">
      <article v-for="metric in metrics" :key="metric.label" class="metric-card">
        <span>{{ metric.label }}</span>
        <strong>{{ metric.value }}</strong>
      </article>
    </div>

    <section class="content-panel">
      <h2>初始化狀態</h2>
      <p>平台骨架已建立，可開始接入 WordPress 插件、API 服務與 Worker 任務流程。</p>
    </section>
  </section>
</template>
