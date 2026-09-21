import { theme as antTheme } from 'ant-design-vue';
import type { ThemeConfig } from 'ant-design-vue/es/config-provider/context';

export const darkWorkspacePalette = {
  canvas: '#0D1715',
  surface: '#172220',
  elevated: '#1D2B28',
  fill: '#1B2926',
  border: '#5B7169',
  borderSecondary: '#334440',
  primary: '#54D0C3',
  primaryHover: '#9BF2EB',
  primaryActive: '#258C83',
  primaryText: '#092A27',
  text: '#EDF5F2',
  textSecondary: '#B6C5C0',
  textTertiary: '#9AACA6',
  textDisabled: '#748984'
} as const;

export const darkAntDesignTheme: ThemeConfig = {
  algorithm: antTheme.darkAlgorithm,
  token: {
    colorPrimary: darkWorkspacePalette.primary,
    colorPrimaryHover: darkWorkspacePalette.primaryHover,
    colorPrimaryActive: darkWorkspacePalette.primaryActive,
    colorLink: darkWorkspacePalette.primaryHover,
    colorLinkHover: '#B9FAF4',
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
    controlItemBgActive: '#163C38',
    controlItemBgActiveHover: '#204D48',
    controlOutline: darkWorkspacePalette.primary,
    borderRadius: 8
  }
};

export const darkEChartsTheme = {
  color: [darkWorkspacePalette.primary, '#F0AE54', '#6CCBC2', '#E27A64'],
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
