import cors from '@fastify/cors';
import Fastify from 'fastify';
import { createWordPressAdapter } from '@aieo/cms-adapters';

export function createServer() {
  const app = Fastify({
    logger: true
  });

  app.register(cors, {
    origin: true
  });

  app.get('/health', async () => ({
    success: true,
    message: 'API 服務正常',
    data: {
      service: 'api'
    }
  }));

  app.get('/api/v1/cms-adapters', async () => ({
    success: true,
    message: '操作成功',
    data: {
      adapters: [
        createWordPressAdapter().getCapabilities(),
        {
          platform: 'joomla',
          phase: 'Phase 2',
          status: 'reserved'
        },
        {
          platform: 'opencart',
          phase: 'Phase 3',
          status: 'reserved'
        }
      ]
    }
  }));

  return app;
}
