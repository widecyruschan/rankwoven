import { defineConfig } from 'vite';
import { fileURLToPath, URL } from 'node:url';
import vue from '@vitejs/plugin-vue';

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-vue': ['vue', 'vue-router', 'pinia', 'vue-i18n'],
          'vendor-antdv': ['ant-design-vue', '@ant-design/icons-vue'],
          'vendor-echarts': ['echarts', 'vue-echarts']
        }
      }
    }
  },
  server: {
    host: '0.0.0.0',
    port: 5173,
    allowedHosts: ['rankwoven.com', 'www.rankwoven.com', 'api.rankwoven.com']
  },
  test: {
    environment: 'jsdom'
  }
});
