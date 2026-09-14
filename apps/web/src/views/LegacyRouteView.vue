<script setup lang="ts">
import { computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { getRouteById, getRoutePath } from '../constants/routeRegistry';

const route = useRoute();
const router = useRouter();
const targetId = computed(() => typeof route.meta.legacyTargetId === 'string' ? route.meta.legacyTargetId : 'app-sites');

onMounted(() => {
  const target = getRouteById(targetId.value);
  const siteId = typeof route.query.siteId === 'string' ? route.query.siteId : undefined;
  if (target.siteScope === 'required' && siteId) {
    void router.replace({ path: getRoutePath(target.id, { siteId }), query: route.query });
    return;
  }
  void router.replace(target.siteScope === 'required' ? getRoutePath('app-sites') : getRoutePath(target.id));
});
</script>

<template><a-spin /></template>
