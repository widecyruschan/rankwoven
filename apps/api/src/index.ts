import { apiConfig } from './config';
import { createServer } from './server';

const server = createServer();

try {
  await server.listen({
    host: apiConfig.API_HOST,
    port: apiConfig.API_PORT
  });
} catch (error) {
  server.log.error(error);
  process.exit(1);
}
