<script setup lang="ts">
import { useI18n } from 'vue-i18n';
import { Tooltip, Tag } from 'ant-design-vue';

const { t } = useI18n();

defineProps<{
  visible: boolean;
  position?: number;
  clicks?: number;
  impressions?: number;
}>();
</script>

<template>
  <Tooltip v-if="visible" :title="t('searchConsole.gscBadgeTooltip')">
    <Tag color="green" style="margin-left: 4px; cursor: help;">
      {{ t('searchConsole.gscBadge') }}
      <span v-if="clicks !== undefined" style="margin-left: 4px; opacity: 0.8;">
        ({{ impressions }} / {{ clicks }})
      </span>
    </Tag>
  </Tooltip>
</template>
