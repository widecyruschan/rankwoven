<script setup lang="ts">
const adapters = [
  { name: 'WordPress', phase: 'MVP', status: '參考實現' },
  { name: 'Joomla', phase: 'Phase 2', status: '預留' },
  { name: 'OpenCart', phase: 'Phase 3', status: '預留' }
];
</script>

<template>
  <section class="content-panel">
    <h2>CMS 適配器</h2>
    <div class="table-like" role="table" aria-label="CMS 適配器列表">
      <div class="table-row table-head" role="row">
        <span>平台</span>
        <span>階段</span>
        <span>狀態</span>
      </div>
      <div v-for="adapter in adapters" :key="adapter.name" class="table-row" role="row">
        <span>{{ adapter.name }}</span>
        <span>{{ adapter.phase }}</span>
        <span>{{ adapter.status }}</span>
      </div>
    </div>
  </section>
</template>
