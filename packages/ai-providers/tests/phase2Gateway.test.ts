import { describe, expect, it } from 'vitest';
import { createAiGatewayAdapter } from '../src/phase2Gateway';

function createResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' }
  });
}

describe('Breakout AI gateway adapter', () => {
  it('maps model catalog and endpoint aliases without exposing secrets', async () => {
    const requests: Request[] = [];
    const adapter = createAiGatewayAdapter({
      baseUrl: 'https://gateway.example.test/',
      apiKey: 'test-secret',
      fetchImpl: async (input, init) => {
        requests.push(new Request(input, init));
        return createResponse({
          data: [
            { id: 'text-model', owned_by: 'gateway', supported_endpoint_types: ['chat.completions'] },
            { id: 'embed-model', capabilities: ['embeddings'] }
          ]
        });
      }
    });

    const models = await adapter.listModels();
    expect(models).toEqual([
      expect.objectContaining({ modelId: 'text-model', supportedEndpointTypes: ['chat'] }),
      expect.objectContaining({ modelId: 'embed-model', supportedEndpointTypes: ['embedding'] })
    ]);
    expect(requests[0].url).toBe('https://gateway.example.test/v1/models');
    expect(requests[0].headers.get('authorization')).toBe('Bearer test-secret');
  });

  it('maps chat usage and refuses to return upstream error bodies', async () => {
    const adapter = createAiGatewayAdapter({
      baseUrl: 'https://gateway.example.test',
      apiKey: 'test-secret',
      fetchImpl: async () => createResponse({
        id: 'request-1',
        choices: [{ message: { content: 'ok' }, finish_reason: 'stop' }],
        usage: { prompt_tokens: 12, completion_tokens: 7 }
      })
    });

    await expect(adapter.generateText({
      modelId: 'text-model',
      messages: [{ role: 'user', content: 'hello' }]
    })).resolves.toMatchObject({
      text: 'ok',
      inputTokens: 12,
      outputTokens: 7,
      refused: false,
      truncated: false
    });

    const failingAdapter = createAiGatewayAdapter({
      baseUrl: 'https://gateway.example.test',
      apiKey: 'test-secret',
      fetchImpl: async () => createResponse({ error: 'sensitive upstream detail' }, 429)
    });
    await expect(failingAdapter.listModels()).rejects.toThrow('AI_GATEWAY_HTTP_429');
    await expect(failingAdapter.listModels()).rejects.not.toThrow('sensitive upstream detail');
  });

  it('maps embedding and image responses and aborts timed out requests', async () => {
    const adapter = createAiGatewayAdapter({
      baseUrl: 'https://gateway.example.test',
      apiKey: 'test-secret',
      timeoutMs: 5,
      fetchImpl: async (input) => {
        if (String(input).endsWith('/v1/embeddings')) {
          return createResponse({ data: [{ embedding: [0.1, 0.2] }], usage: { prompt_tokens: 4 } });
        }
        if (String(input).endsWith('/v1/images/generations')) {
          return createResponse({ data: [{ url: 'https://assets.example.test/image.png' }] });
        }
        await new Promise((resolve) => setTimeout(resolve, 25));
        throw new DOMException('aborted', 'AbortError');
      }
    });

    await expect(adapter.createEmbedding({ modelId: 'embed-model', input: 'hello' })).resolves.toMatchObject({
      embeddings: [[0.1, 0.2]],
      inputTokens: 4
    });
    await expect(adapter.generateImage({ modelId: 'image-model', prompt: 'test' })).resolves.toMatchObject({
      urls: ['https://assets.example.test/image.png'],
      imageCount: 1
    });
    await expect(adapter.listModels()).rejects.toThrow('AI_GATEWAY_TIMEOUT');
  });
});
