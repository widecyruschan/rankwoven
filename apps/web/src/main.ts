import { computed, createApp, defineComponent, h } from 'vue';
import { createPinia } from 'pinia';
import {
  Alert,
  Breadcrumb,
  Button,
  Card,
  Col,
  ConfigProvider,
  Dropdown,
  Form,
  Input,
  Layout,
  Menu,
  Modal,
  Progress,
  Row,
  Select,
  Spin,
  Statistic,
  Table,
  Tabs,
  Tag
} from 'ant-design-vue';
import type { ThemeConfig } from 'ant-design-vue/es/config-provider/context';
import 'ant-design-vue/dist/reset.css';
import './styles.css';
import App from './App.vue';
import { initializeTheme, useTheme } from './composables/useTheme';
import { i18n } from './i18n';
import { router } from './router';
import { darkAntDesignTheme, lightWorkspaceTheme } from './theme/darkWorkspaceTheme';

initializeTheme();

const ThemedRoot = defineComponent({
  name: 'ThemedRoot',
  setup() {
    const { isDark } = useTheme();
    const antDesignTheme = computed<ThemeConfig>(() => (isDark.value ? darkAntDesignTheme : lightWorkspaceTheme));

    return () => h(ConfigProvider, { theme: antDesignTheme.value }, { default: () => h(App) });
  }
});

const app = createApp(ThemedRoot);

app.use(createPinia());
app.use(router);
[
  Alert,
  Breadcrumb,
  Button,
  Card,
  Col,
  Dropdown,
  Form,
  Input,
  Layout,
  Menu,
  Modal,
  Progress,
  Row,
  Select,
  Spin,
  Statistic,
  Table,
  Tabs,
  Tag
].forEach((component) => {
  app.use(component);
});
app.use(i18n);

app.mount('#app');
