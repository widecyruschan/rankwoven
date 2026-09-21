import { theme as antTheme } from 'ant-design-vue';
import type { ThemeConfig } from 'ant-design-vue/es/config-provider/context';

export const lightWorkspaceTheme: ThemeConfig = {
  token: {
    colorPrimary: '#3080F0',
    colorPrimaryHover: '#4C96FF',
    colorPrimaryActive: '#1F64CF',
    colorLink: '#1F64CF',
    colorLinkHover: '#3080F0',
    colorBgBase: '#F3F6FA',
    colorBgLayout: '#F3F6FA',
    colorBgContainer: '#FFFFFF',
    colorBgElevated: '#FFFFFF',
    colorFillAlter: '#F7F9FC',
    colorText: '#1B2738',
    colorTextHeading: '#142238',
    colorTextSecondary: '#64748B',
    colorTextTertiary: '#718096',
    colorTextDescription: '#718096',
    colorTextPlaceholder: '#8B9AAF',
    colorTextDisabled: '#A7B3C2',
    colorTextLightSolid: '#FFFFFF',
    colorBorder: '#DBE4EF',
    colorBorderSecondary: '#E7EDF4',
    colorSplit: '#E7EDF4',
    colorIcon: '#718096',
    colorIconHover: '#1B2738',
    controlItemBgHover: '#F3F7FF',
    controlItemBgActive: '#E8F1FF',
    controlItemBgActiveHover: '#DDEAFF',
    controlOutline: '#3080F0',
    borderRadius: 8
  }
};

export const darkWorkspacePalette = {
  canvas: '#101020',
  surface: '#102030',
  elevated: '#203040',
  fill: '#182A3D',
  border: '#526B89',
  borderSecondary: '#2F4055',
  primary: '#5C9DFF',
  primaryHover: '#A9CAFF',
  primaryActive: '#2F73D2',
  primaryText: '#0C1B2C',
  text: '#EDF3FB',
  textSecondary: '#B6C3D3',
  textTertiary: '#A2B2C7',
  textDisabled: '#7B8FA8'
} as const;

export const darkAntDesignTheme: ThemeConfig = {
  algorithm: antTheme.darkAlgorithm,
  token: {
    colorPrimary: darkWorkspacePalette.primary,
    colorPrimaryHover: darkWorkspacePalette.primaryHover,
    colorPrimaryActive: darkWorkspacePalette.primaryActive,
    colorLink: darkWorkspacePalette.primaryHover,
    colorLinkHover: '#C1D8FF',
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
    controlItemBgActive: '#16345F',
    controlItemBgActiveHover: '#204A82',
    controlOutline: darkWorkspacePalette.primary,
    borderRadius: 8
  }
};

export const darkEChartsTheme = {
  color: [darkWorkspacePalette.primary, '#31C99A', '#F0A342', '#E27A64'],
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
