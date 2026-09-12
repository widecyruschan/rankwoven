<script setup lang="ts">
import { computed } from 'vue';
import { use } from 'echarts/core';
import { BarChart, LineChart } from 'echarts/charts';
import { GridComponent, LegendComponent, TooltipComponent } from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';
import VChart from 'vue-echarts';
import type { EChartsOption } from 'echarts';
import { useTheme } from '../composables/useTheme';
import { darkEChartsTheme } from '../theme/darkWorkspaceTheme';

use([BarChart, LineChart, GridComponent, LegendComponent, TooltipComponent, CanvasRenderer]);

defineProps<{
  option: EChartsOption;
  height?: string;
}>();

const { theme, isDark } = useTheme();
const chartTheme = computed(() => (isDark.value ? darkEChartsTheme : undefined));
</script>

<template>
  <VChart
    :key="theme"
    class="analytics-chart"
    :option="option"
    :theme="chartTheme"
    autoresize
    :style="{ height: height ?? '320px' }"
  />
</template>
