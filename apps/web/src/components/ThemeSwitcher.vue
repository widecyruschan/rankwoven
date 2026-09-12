<script setup lang="ts">
import { computed } from 'vue';
import { Moon, Sun } from 'lucide-vue-next';
import { useI18n } from 'vue-i18n';
import { useTheme } from '../composables/useTheme';

const { t } = useI18n();
const { isDark, toggleTheme } = useTheme();
const label = computed(() => (isDark.value ? t('theme.light') : t('theme.dark')));
const ariaLabel = computed(() => (isDark.value ? t('theme.switchToLight') : t('theme.switchToDark')));
</script>

<template>
  <a-button
    class="theme-switcher"
    type="default"
    :aria-label="ariaLabel"
    :aria-pressed="isDark"
    :title="ariaLabel"
    @click="toggleTheme"
  >
    <template #icon>
      <Sun v-if="isDark" :size="16" aria-hidden="true" />
      <Moon v-else :size="16" aria-hidden="true" />
    </template>
    {{ label }}
  </a-button>
</template>
