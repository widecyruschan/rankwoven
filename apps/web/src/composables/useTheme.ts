import { computed, ref } from 'vue';

export type ThemeMode = 'light' | 'dark';

const themeStorageKey = 'aieo-theme';
const theme = ref<ThemeMode>('light');
let initialized = false;

function isThemeMode(value: string | null): value is ThemeMode {
  return value === 'light' || value === 'dark';
}

function applyTheme(mode: ThemeMode) {
  if (typeof document === 'undefined') return;

  document.documentElement.dataset.theme = mode;
  document.documentElement.style.colorScheme = mode;
}

export function initializeTheme() {
  if (initialized || typeof window === 'undefined') return;

  const storedTheme = window.localStorage.getItem(themeStorageKey);
  theme.value = isThemeMode(storedTheme) ? storedTheme : 'light';
  applyTheme(theme.value);
  initialized = true;
}

export function useTheme() {
  initializeTheme();

  const isDark = computed(() => theme.value === 'dark');

  function setTheme(nextTheme: ThemeMode) {
    theme.value = nextTheme;
    applyTheme(nextTheme);
    globalThis.localStorage?.setItem(themeStorageKey, nextTheme);
  }

  function toggleTheme() {
    setTheme(isDark.value ? 'light' : 'dark');
  }

  return {
    theme,
    isDark,
    setTheme,
    toggleTheme
  };
}
