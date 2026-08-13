import { createApp } from 'vue';
import { createPinia } from 'pinia';
import {
  Alert,
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
} from 'ant-design-vue';
import 'ant-design-vue/dist/reset.css';
import './styles.css';
import App from './App.vue';
import { i18n } from './i18n';
import { router } from './router';

const app = createApp(App);

app.use(createPinia());
app.use(router);
[
  Alert,
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
