<script setup lang="ts">
import { use } from 'echarts/core';
import { BarChart, LineChart } from 'echarts/charts';
import { GridComponent, LegendComponent, TooltipComponent } from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';
import VChart from 'vue-echarts';
import type { EChartsOption } from 'echarts';

use([BarChart, LineChart, GridComponent, LegendComponent, TooltipComponent, CanvasRenderer]);

defineProps<{
  option: EChartsOption;
  height?: string;
}>();
</script>

<template>
  <VChart class="analytics-chart" :option="option" autoresize :style="{ height: height ?? '320px' }" />
</template>
