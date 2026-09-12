import { theme as antTheme } from 'ant-design-vue';
import type { ThemeConfig } from 'ant-design-vue/es/config-provider/context';

export const darkWorkspacePalette = {
  canvas: '#121620',
  surface: '#1D2133',
  elevated: '#242A3D',
  fill: '#202437',
  border: '#626E8A',
  borderSecondary: '#373E56',
  primary: '#7AA2F7',
  primaryHover: '#8AB8FF',
  primaryActive: '#5882BD',
  primaryText: '#111827',
  text: '#F0F3F8',
  textSecondary: '#C4CBD8',
  textTertiary: '#98A3B7',
  textDisabled: '#8290A6'
} as const;

export const darkAntDesignTheme: ThemeConfig = {
  algorithm: antTheme.darkAlgorithm,
  token: {
    colorPrimary: darkWorkspacePalette.primary,
    colorPrimaryHover: darkWorkspacePalette.primaryHover,
    colorPrimaryActive: darkWorkspacePalette.primaryActive,
    colorLink: darkWorkspacePalette.primaryHover,
    colorLinkHover: '#A9CAFF',
    colorLinkActive: darkWorkspacePalette.primary,
    colorBgBase: darkWorkspacePalette.canvas,
    colorBgLayout: darkWorkspacePalette.canvas,
    colorBgContainer: darkWorkspacePalette.surface,
    colorBgElevated: darkWorkspacePalette.elevated,
    colorBgContainerDisabled: darkWorkspacePalette.fill,
    colorFillAlter: darkWorkspacePalette.fill,
    colorText: darkWorkspacePalette.text,
    colorTextHeading: '#F7F9FC',
    colorTextSecondary: darkWorkspacePalette.textSecondary,
    colorTextTertiary: darkWorkspacePalette.textTertiary,
    colorTextDescription: darkWorkspacePalette.textTertiary,
    colorTextPlaceholder: darkWorkspacePalette.textTertiary,
    colorTextDisabled: darkWorkspacePalette.textDisabled,
    colorTextLightSolid: darkWorkspacePalette.primaryText,
    colorBorder: darkWorkspacePalette.border,
    colorBorderSecondary: darkWorkspacePalette.borderSecondary,
    colorSplit: darkWorkspacePalette.borderSecondary,
    colorIcon: darkWorkspacePalette.textTertiary,
    colorIconHover: darkWorkspacePalette.text,
    controlItemBgHover: darkWorkspacePalette.elevated,
    controlItemBgActive: '#2A3D60',
    controlItemBgActiveHover: '#304970',
    controlOutline: darkWorkspacePalette.primary,
    borderRadius: 8
  }
};

export const darkEChartsTheme = {
  color: [darkWorkspacePalette.primary, '#64D2A4', '#F4C95D', '#B794F4'],
  backgroundColor: 'transparent',
  textStyle: { color: darkWorkspacePalette.textSecondary },
  title: {
    textStyle: { color: darkWorkspacePalette.text },
    subtextStyle: { color: darkWorkspacePalette.textTertiary }
  },
  legend: { textStyle: { color: darkWorkspacePalette.textSecondary } },
  tooltip: {
    backgroundColor: darkWorkspacePalette.elevated,
    borderColor: darkWorkspacePalette.border,
    textStyle: { color: darkWorkspacePalette.text }
  },
  categoryAxis: {
    axisLine: { lineStyle: { color: darkWorkspacePalette.border } },
    axisTick: { lineStyle: { color: darkWorkspacePalette.border } },
    axisLabel: { color: darkWorkspacePalette.textTertiary },
    splitLine: { lineStyle: { color: darkWorkspacePalette.borderSecondary } }
  },
  valueAxis: {
    axisLine: { lineStyle: { color: darkWorkspacePalette.border } },
    axisTick: { lineStyle: { color: darkWorkspacePalette.border } },
    axisLabel: { color: darkWorkspacePalette.textTertiary },
    splitLine: { lineStyle: { color: darkWorkspacePalette.borderSecondary } }
  }
};
