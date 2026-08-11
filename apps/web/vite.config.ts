import { defineConfig, type Plugin } from 'vite';
import { fileURLToPath, URL } from 'node:url';
import vue from '@vitejs/plugin-vue';

function isBackofficeRoute(url?: string) {
  const pathname = (url ?? '').split('?')[0];
  return pathname === '/app' || pathname.startsWith('/app/') || pathname === '/admin' || pathname.startsWith('/admin/');
}

function backofficeRobotsHeaderPlugin(): Plugin {
  const applyHeader = (url: string | undefined, setHeader: (name: string, value: string) => void) => {
    if (isBackofficeRoute(url)) {
      setHeader('X-Robots-Tag', 'noindex, nofollow, noarchive');
    }
  };

  return {
    name: 'rankwoven-backoffice-robots-header',
    configureServer(server) {
      server.middlewares.use((request, response, next) => {
        applyHeader(request.url, response.setHeader.bind(response));
        next();
      });
    },
    configurePreviewServer(server) {
      server.middlewares.use((request, response, next) => {
        applyHeader(request.url, response.setHeader.bind(response));
        next();
      });
    }
  };
}

export default defineConfig({
  plugins: [backofficeRobotsHeaderPlugin(), vue()],
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
