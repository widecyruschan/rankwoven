import { createWordPressAdapter } from '@aieo/cms-adapters';

const adapter = createWordPressAdapter();
const heartbeatMs = 30_000;

function logWorkerHeartbeat() {
  const capabilities = adapter.getCapabilities();
  console.log(
    JSON.stringify({
      service: 'worker',
      status: 'idle',
      cmsAdapter: capabilities.platform,
      timestamp: new Date().toISOString()
    })
  );
}

logWorkerHeartbeat();
setInterval(logWorkerHeartbeat, heartbeatMs);
